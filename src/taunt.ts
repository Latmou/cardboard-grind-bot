import { ScoreRow } from './db';

export interface ChartContext {
  actualName: string;
  isSelf: boolean;
  scores: ScoreRow[];
  days: number;
  mode: 'rank' | 'rankScore';
}

export interface LeaderboardContext {
  isInList: boolean;
  isTop: boolean;
  isGuild: boolean;
  topPlayers: ScoreRow[];
  previousTopPlayers?: ScoreRow[];
  currentUserId?: string;
}

export class Taunt {
  private static getRandom(taunts: string[]): string {
    return taunts[Math.floor(Math.random() * taunts.length)];
  }

  private static getLeague(rs: number): string {
    if (rs >= 50000) return 'Ruby'; 
    if (rs >= 40000) return 'Diamond';
    if (rs >= 30000) return 'Platinum';
    if (rs >= 20000) return 'Gold';
    if (rs >= 10000) return 'Silver';
    return 'Bronze';
  }

  static getChartTaunt(ctx: ChartContext): string {
    const { scores, isSelf, actualName, mode } = ctx;
    if (scores.length === 0) return "";

    const last = scores[scores.length - 1];
    const rs = last.rankScore;
    const league = last.league === 'Ruby' ? 'Ruby' : this.getLeague(rs);
    
    const first = scores[0];
    const noChange = mode === 'rank' ? last.rank === first.rank : last.rankScore === first.rankScore;

    const isImprovement = mode === 'rank' ? last.rank < first.rank : last.rankScore > first.rankScore;

    // Special Case: Stagnation (no change for at least 3 days if requested days >= 3)
    // We also check if there is a gap in timestamps or if all scores in the period are the same
    const allSame = scores.every(s => mode === 'rank' ? s.rank === first.rank : s.rankScore === first.rankScore);

    if (allSame && ctx.days >= 3 && scores.length >= 2) {
      if (isSelf) {
        return this.getRandom([
          "Finally back to ranked? At this rate, Ruby is just a dream.",
          "Three days and no progress? The grind doesn't wait for anyone!",
          "Still at the same spot? Wake up and smell the competition!",
          "Stagnating? That's just a fancy word for 'getting overtaken'."
        ]);
      } else {
        return this.getRandom([
          `${actualName} hasn't moved an inch. Lazy much?`,
          `Is ${actualName} even playing? The chart is as flat as a pancake.`,
          `No progress for ${actualName}. Someone's getting comfortable in their league.`
        ]);
      }
    }

    // League specific taunts for near-boundaries (Self only for now for precision)
    if (isSelf) {
      if (league === 'Platinum' && rs >= 37500) {
        return this.getRandom([
          "You're smelling that Diamond rank! Just a little more sweat!",
          "Almost Diamond! Don't choke now.",
          "Platinum is for regulars. Diamond is where the fun starts. You're close!"
        ]);
      }
      if (league === 'Diamond') {
        if (rs >= 47500) return "You're knocking on Ruby's door! Top 500 is right there!";
        if (rs >= 45000) return "Solid Diamond player. You're actually good at this!";
        if (rs >= 42500) return "Not bad, you're becoming a threat in Diamond.";
        return "Diamond status achieved. Welcome to the big leagues.";
      }
      if (league === 'Silver' || league === 'Bronze') {
        return this.getRandom([
          "Bronze/Silver? Are you playing with a steering wheel?",
          "I've seen bots with better rank scores. Get it together!",
          "Is this your first time using a controller? Or a mouse?"
        ]);
      }
    }

    // Default Improvement/Decline taunts
    if (isImprovement) {
      if (isSelf) {
        return this.getRandom([
          "Look at you go! Keep that momentum!",
          "I'm proud of you, son. You're actually getting better!",
          "Rising to the top, one game at a time!",
          "The grind is finally paying off!"
        ]);
      } else {
        return this.getRandom([
          `${actualName} is actually cooking!`,
          `Watch out, ${actualName} is on a roll!`,
          `Impressive gains by ${actualName}.`,
          `Someone's been practicing! Good job ${actualName}.`
        ]);
      }
    } else {
      if (isSelf) {
        return this.getRandom([
          "Oh wow, you really tumbled down!",
          "Maybe take a break? This chart is painful to look at.",
          "Oof, that's a steep decline.",
          "Are you playing with your eyes closed?"
        ]);
      } else {
        return this.getRandom([
          `Yikes, ${actualName} is falling off.`,
          `Rough times for ${actualName}.`,
          `Someone tell ${actualName} the goal is to go UP.`,
          `${actualName}'s chart looks like a ski slope.`
        ]);
      }
    }
  }

  static getLeaderboardTaunt(ctx: LeaderboardContext): string {
    const { isInList, isTop, isGuild, topPlayers, previousTopPlayers } = ctx;

    if (isGuild && previousTopPlayers && previousTopPlayers.length > 0) {
      // Check for overtakes in guild
      for (const current of topPlayers) {
        const prev = previousTopPlayers.find(p => p.name === current.name);
        if (prev) {
          // Find someone who was above but now is below
          const overtakes = previousTopPlayers.filter(p => p.rank < prev.rank)
                            .filter(p => {
                              const curr = topPlayers.find(c => c.name === p.name);
                              return curr && curr.rank > current.rank;
                            });
          
          if (overtakes.length > 0) {
            const victim = overtakes[0].name.split('#')[0];
            const winner = current.name.split('#')[0];
            return `Oh! ${winner} just absolutely smoked ${victim} in the rankings!`;
          }
        }
      }
    }

    if (isTop) {
      return this.getRandom([
        "The absolute crème de la crème!",
        "Look at those legends at the top.",
        "Gods among men.",
        "The air must be thin up there."
      ]);
    }

    if (isInList) {
      return this.getRandom([
        "Looking good! You're in the world's elite.",
        "There you are! Keep climbing!",
        "A wild pro appeared in the rankings!",
        "Nice! You're making a name for yourself."
      ]);
    }

    return this.getRandom([
      "You'll never make it into this ranking at this rate.",
      "The view from the bottom must be nice too.",
      "Keep dreaming, maybe one day you'll be here.",
      "This is a restricted area for pros only.",
      "Maybe if you practice for 10,000 more hours?"
    ]);
  }
}
