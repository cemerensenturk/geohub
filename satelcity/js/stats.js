/**
 * SatelCity - Independent Mode Statistics & Seen City Tracker
 * Tracks statistics and encountered cities separately in localStorage
 * for Multiple Choice ('mc') and Text Guess ('text') modes.
 */

const STORAGE_KEY_PREFIX = "satelcity_stats_v2_";

export class StatsManager {
  constructor() {
    this.stats = {
      mc: this.loadModeStats('mc'),
      text: this.loadModeStats('text')
    };
  }

  loadModeStats(mode) {
    try {
      const data = localStorage.getItem(STORAGE_KEY_PREFIX + mode);
      if (data) {
        const parsed = JSON.parse(data);
        return {
          played: Number(parsed.played) || 0,
          correct: Number(parsed.correct) || 0,
          seenCityIds: Array.isArray(parsed.seenCityIds) ? parsed.seenCityIds : []
        };
      }
    } catch (e) {
      console.warn("Stats load error for " + mode, e);
    }
    return { played: 0, correct: 0, seenCityIds: [] };
  }

  saveModeStats(mode) {
    try {
      localStorage.setItem(STORAGE_KEY_PREFIX + mode, JSON.stringify(this.stats[mode]));
    } catch (e) {
      console.warn("Stats save error for " + mode, e);
    }
  }

  recordResult(mode, cityId, isCorrect) {
    if (!this.stats[mode]) return this.getModeStats(mode);

    this.stats[mode].played += 1;
    if (isCorrect) {
      this.stats[mode].correct += 1;
    }

    if (cityId && !this.stats[mode].seenCityIds.includes(cityId)) {
      this.stats[mode].seenCityIds.push(cityId);
    }

    this.saveModeStats(mode);
    return this.getModeStats(mode);
  }

  getModeStats(mode) {
    const data = this.stats[mode] || { played: 0, correct: 0, seenCityIds: [] };
    const accuracy = data.played > 0 ? Math.round((data.correct / data.played) * 100) : 0;
    return {
      played: data.played,
      correct: data.correct,
      accuracy,
      formattedText: `${data.correct} / ${data.played}`,
      formattedPct: `${accuracy}%`
    };
  }

  /**
   * Returns cities of a specific difficulty level that haven't been seen yet
   */
  getAvailableCities(mode, difficulty, allCities) {
    const tierCities = allCities.filter(c => c.difficulty === difficulty);
    const seenIds = (this.stats[mode] && this.stats[mode].seenCityIds) || [];
    return tierCities.filter(c => !seenIds.includes(c.id));
  }

  resetMode(mode) {
    this.stats[mode] = { played: 0, correct: 0, seenCityIds: [] };
    this.saveModeStats(mode);
    return this.getModeStats(mode);
  }
}

export const statsManager = new StatsManager();
export default statsManager;
