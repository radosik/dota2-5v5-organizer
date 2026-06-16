use std::time::Duration;

use serde::de::DeserializeOwned;
use serde::Deserialize;

use crate::error::{AppError, AppResult};
use crate::models::{DotaProfile, DotaSearchResult, ResolvedSteamId, STEAM64_BASE};

const BASE_URL: &str = "https://api.opendota.com/api";

const MEDALS: [&str; 8] = [
    "Herald", "Guardian", "Crusader", "Archon", "Legend", "Ancient", "Divine", "Immortal",
];

// ----------------------------------------------------------------------------
// Rank decoding & MMR estimation (see PLAN.md §2)
// ----------------------------------------------------------------------------

/// Turn an OpenDota `rank_tier` (e.g. 74 = Divine 4) into a human label.
pub fn rank_label(rank_tier: Option<i64>, leaderboard_rank: Option<i64>) -> Option<String> {
    let tier = rank_tier?;
    let medal = tier / 10;
    let stars = tier % 10;
    if medal < 1 || medal > 8 {
        return None;
    }
    let name = MEDALS[(medal - 1) as usize];
    if medal == 8 {
        // Immortal: show leaderboard rank when available.
        return Some(match leaderboard_rank {
            Some(lr) => format!("Immortal #{lr}"),
            None => "Immortal".to_string(),
        });
    }
    if (1..=5).contains(&stars) {
        Some(format!("{name} {stars}"))
    } else {
        Some(name.to_string())
    }
}

/// Estimate an MMR number from a rank medal. Pre-fill only — user edits the real value.
pub fn estimate_mmr(rank_tier: Option<i64>, leaderboard_rank: Option<i64>) -> i64 {
    let tier = match rank_tier {
        Some(t) => t,
        None => return 0,
    };
    let medal = tier / 10;
    let stars = tier % 10;
    if medal < 1 || medal > 8 {
        return 0;
    }
    if medal == 8 {
        return match leaderboard_rank {
            Some(lr) if lr <= 10 => 9000,
            Some(lr) if lr <= 100 => 7500,
            Some(lr) if lr <= 1000 => 6500,
            Some(_) => 6000,
            None => 5620,
        };
    }
    // Medals 1..7: 770 MMR per medal, ~154 per star within a medal.
    let s = if stars == 0 { 1 } else { stars };
    let est = (medal - 1) * 770 + (s - 1) * 154;
    est.max(0)
}

// ----------------------------------------------------------------------------
// Steam ID resolution
// ----------------------------------------------------------------------------

/// Convert a 32-bit Dota account_id to a SteamID64 string.
pub fn account_id_to_steam64(account_id: i64) -> String {
    (account_id + STEAM64_BASE).to_string()
}

/// Normalise arbitrary user input (account_id, steamID64, or profile URL) into IDs.
pub fn resolve_steam_input(raw: &str) -> AppResult<ResolvedSteamId> {
    let s = raw.trim();
    if s.is_empty() {
        return Err(AppError::Invalid("Пустой ввод.".into()));
    }

    // Vanity URLs (steamcommunity.com/id/<name>) can't be resolved without a Steam key.
    if s.contains("/id/") {
        return Err(AppError::Invalid(
            "Пользовательские (vanity) ссылки не поддерживаются. Используйте числовую ссылку \
             steamcommunity.com/profiles/…, SteamID или поиск по имени."
                .into(),
        ));
    }

    // Numeric profile URL: …/profiles/7656119…
    let number: i64 = if let Some(idx) = s.find("profiles/") {
        let rest = &s[idx + "profiles/".len()..];
        let digits: String = rest.chars().take_while(|c| c.is_ascii_digit()).collect();
        digits
            .parse()
            .map_err(|_| AppError::Invalid("Не удалось распознать SteamID в ссылке.".into()))?
    } else {
        let digits: String = s.chars().filter(|c| c.is_ascii_digit()).collect();
        if digits.is_empty() {
            return Err(AppError::Invalid(
                "Введите SteamID, числовую ссылку на профиль или ищите по имени.".into(),
            ));
        }
        digits
            .parse()
            .map_err(|_| AppError::Invalid("Число слишком велико для SteamID.".into()))?
    };

    let (account_id, steam_id64) = if number >= STEAM64_BASE {
        (number - STEAM64_BASE, number.to_string())
    } else {
        (number, (number + STEAM64_BASE).to_string())
    };

    Ok(ResolvedSteamId {
        account_id,
        steam_id64,
    })
}

// ----------------------------------------------------------------------------
// Network calls
// ----------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
struct RawSearch {
    account_id: i64,
    personaname: Option<String>,
    avatarfull: Option<String>,
    last_match_time: Option<String>,
    // OpenDota currently returns this as `sml`; accept both spellings.
    #[serde(alias = "sml", alias = "similarity")]
    similarity: Option<f64>,
}

#[derive(Debug, Deserialize)]
struct RawProfile {
    personaname: Option<String>,
    avatarfull: Option<String>,
    profileurl: Option<String>,
}

#[derive(Debug, Deserialize)]
struct RawPlayerResponse {
    profile: Option<RawProfile>,
    rank_tier: Option<i64>,
    leaderboard_rank: Option<i64>,
}

const MAX_ATTEMPTS: u32 = 2;

/// Status codes worth retrying (rate-limit + Cloudflare/origin 5xx, incl. 522).
fn is_transient_status(code: u16) -> bool {
    matches!(code, 429 | 500 | 502 | 503 | 504 | 520 | 521 | 522 | 523 | 524)
}

fn status_error(code: u16) -> AppError {
    let msg = match code {
        429 => "OpenDota ограничивает частоту запросов — подождите несколько секунд и повторите.".to_string(),
        404 => "Игрок не найден в OpenDota.".to_string(),
        500 | 502 | 503 | 504 | 520..=524 => format!(
            "OpenDota временно недоступна (HTTP {code}). Повторите позже или добавьте игрока вручную."
        ),
        _ => format!("OpenDota вернула ошибку (HTTP {code})."),
    };
    AppError::Network(msg)
}

fn transport_error(e: &reqwest::Error) -> AppError {
    if e.is_timeout() {
        AppError::Network(
            "OpenDota не отвечает — возможно, перегрузка. Повторите позже или добавьте игрока вручную."
                .into(),
        )
    } else {
        AppError::Network(
            "Не удалось подключиться к OpenDota — проверьте интернет или добавьте игрока вручную.".into(),
        )
    }
}

/// GET a URL and parse JSON, retrying once on transient (5xx / timeout) failures.
async fn get_json<T: DeserializeOwned>(
    client: &reqwest::Client,
    url: &str,
    query: &[(&str, &str)],
) -> AppResult<T> {
    let mut last: Option<AppError> = None;
    for attempt in 0..MAX_ATTEMPTS {
        let mut req = client.get(url);
        if !query.is_empty() {
            req = req.query(query);
        }
        match req.send().await {
            Ok(resp) => {
                let code = resp.status().as_u16();
                if resp.status().is_success() {
                    return resp.json::<T>().await.map_err(|e| {
                        AppError::Network(format!("Не удалось обработать ответ OpenDota: {e}"))
                    });
                }
                let err = status_error(code);
                if is_transient_status(code) && attempt + 1 < MAX_ATTEMPTS {
                    last = Some(err);
                    tokio::time::sleep(Duration::from_millis(500 * (attempt as u64 + 1))).await;
                    continue;
                }
                return Err(err);
            }
            Err(e) => {
                let err = transport_error(&e);
                let retryable = e.is_timeout() || e.is_connect() || e.is_request();
                if retryable && attempt + 1 < MAX_ATTEMPTS {
                    last = Some(err);
                    tokio::time::sleep(Duration::from_millis(500 * (attempt as u64 + 1))).await;
                    continue;
                }
                return Err(err);
            }
        }
    }
    Err(last.unwrap_or_else(|| AppError::Network("Запрос к OpenDota не выполнен.".into())))
}

/// Search OpenDota for players by persona name.
pub async fn search_players(
    client: &reqwest::Client,
    query: &str,
) -> AppResult<Vec<DotaSearchResult>> {
    let q = query.trim();
    if q.is_empty() {
        return Ok(vec![]);
    }
    let url = format!("{BASE_URL}/search");
    let raw: Vec<RawSearch> = get_json(client, &url, &[("q", q)]).await?;

    Ok(raw
        .into_iter()
        .map(|r| DotaSearchResult {
            account_id: r.account_id,
            persona_name: r.personaname,
            avatar_full: r.avatarfull,
            last_match_time: r.last_match_time,
            similarity: r.similarity,
        })
        .collect())
}

/// Fetch a full player profile + rank from OpenDota.
pub async fn fetch_profile(client: &reqwest::Client, account_id: i64) -> AppResult<DotaProfile> {
    let url = format!("{BASE_URL}/players/{account_id}");
    let raw: RawPlayerResponse = get_json(client, &url, &[]).await?;

    let is_private = raw.profile.is_none();
    let (persona_name, avatar_full, profile_url) = match raw.profile {
        Some(p) => (p.personaname, p.avatarfull, p.profileurl),
        None => (None, None, None),
    };

    Ok(DotaProfile {
        account_id,
        steam_id64: account_id_to_steam64(account_id),
        persona_name,
        avatar_full,
        profile_url,
        rank_tier: raw.rank_tier,
        leaderboard_rank: raw.leaderboard_rank,
        rank_label: rank_label(raw.rank_tier, raw.leaderboard_rank),
        estimated_mmr: estimate_mmr(raw.rank_tier, raw.leaderboard_rank),
        is_private,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn labels() {
        assert_eq!(rank_label(Some(74), None).as_deref(), Some("Divine 4"));
        assert_eq!(rank_label(Some(11), None).as_deref(), Some("Herald 1"));
        assert_eq!(rank_label(Some(55), None).as_deref(), Some("Legend 5"));
        assert_eq!(rank_label(Some(80), Some(865)).as_deref(), Some("Immortal #865"));
        assert_eq!(rank_label(Some(80), None).as_deref(), Some("Immortal"));
        assert_eq!(rank_label(None, None), None);
    }

    #[test]
    fn estimates() {
        assert_eq!(estimate_mmr(None, None), 0);
        assert_eq!(estimate_mmr(Some(11), None), 0); // Herald 1
        assert_eq!(estimate_mmr(Some(74), None), 5082); // Divine 4: 6*770 + 3*154
        assert_eq!(estimate_mmr(Some(80), Some(865)), 6500); // Immortal, lb<=1000
        assert_eq!(estimate_mmr(Some(80), None), 5620); // Immortal, no lb
    }

    #[test]
    fn steam_resolution() {
        // 70388657 + 76561197960265728 = 76561198030654385
        let from_account = resolve_steam_input("70388657").unwrap();
        assert_eq!(from_account.account_id, 70388657);
        assert_eq!(from_account.steam_id64, "76561198030654385");

        let from_id64 = resolve_steam_input("76561198030654385").unwrap();
        assert_eq!(from_id64.account_id, 70388657);

        let from_url =
            resolve_steam_input("https://steamcommunity.com/profiles/76561198030654385").unwrap();
        assert_eq!(from_url.account_id, 70388657);

        // Vanity URLs and empty input are rejected.
        assert!(resolve_steam_input("https://steamcommunity.com/id/DendiQ/").is_err());
        assert!(resolve_steam_input("   ").is_err());
    }
}
