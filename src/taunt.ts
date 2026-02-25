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
          "Stagnating? That's just a fancy word for 'getting overtaken'.",
          "Is your keyboard broken or are you just giving up?",
          "The top 500 isn't getting any closer while you sit there.",
          "Tick tock. Every hour you wait, someone else is grinding.",
          "Is this a retirement home or a leaderboard?",
          "Your rank is gathering more dust than a museum exhibit.",
          "I've seen faster movement from a tectonic plate.",
          "Are you waiting for a personal invitation to play?",
          "The only thing growing here is my disappointment.",
          "Did you retire and forget to tell everyone?",
          "Your progress bar is looking like a flatline. RIP.",
          "Even a snail would have gained a few points by now.",
          "Is your strategy to bore the competition into quitting?"
        ]);
      } else {
        return this.getRandom([
          `${actualName} hasn't moved an inch. Lazy much?`,
          `Is ${actualName} even playing? The chart is as flat as a pancake.`,
          `No progress for ${actualName}. Someone's getting comfortable in their league.`,
          `${actualName} is basically a statue at this point.`,
          `Does ${actualName} know the game is still online?`,
          `Legend says ${actualName} is still at the exact same rank.`,
          `${actualName}'s rank is officially fossilized.`,
          `I think ${actualName} found a comfortable spot and decided to hibernate.`,
          `Is ${actualName} on vacation or just stuck in the mud?`,
          `${actualName} is playing a very intense game of 'stay exactly where you are'.`,
          `The world moves on, but ${actualName} stays the same.`,
          `${actualName}'s progress is currently 404: Not Found.`
        ]);
      }
    }

    // League specific taunts for near-boundaries (Self only for now for precision)
    if (isSelf) {
      if (league === 'Platinum' && rs >= 37500) {
        return this.getRandom([
          "You're smelling that Diamond rank! Just a little more sweat!",
          "Almost Diamond! Don't choke now.",
          "Platinum is for regulars. Diamond is where the fun starts. You're close!",
          "The Diamond gates are opening! Don't let them slam shut.",
          "You're outgrowing Platinum. Go claim what's yours!",
          "Final push! Diamond is within arm's reach.",
          "The Diamond rank is calling your name. Can you hear it?",
          "You're on the edge of glory. Don't slip!",
          "One more push and you can leave the Platinum plebs behind.",
          "Platinum is just a memory once you hit that next win.",
          "You've got the momentum. Diamond is inevitable now.",
          "Don't let the Platinum gravity hold you back any longer!"
        ]);
      }
      if (league === 'Diamond') {
        if (rs >= 47500) return this.getRandom([
          "You're knocking on Ruby's door! Top 500 is right there!",
          "Ruby is just a few wins away. Don't let up!",
          "The elite 500 are waiting for you. Almost there!",
          "Ruby rank is so close you can taste it.",
          "You're about to join the gods in Ruby. Don't blink!",
          "The Top 500 club is ready for its newest member."
        ]);
        if (rs >= 45000) return this.getRandom([
          "Solid Diamond player. You're actually good at this!",
          "You're holding your own in the high Diamond ranks. Impressive.",
          "Diamond looks good on you. But Ruby would look better.",
          "High Diamond suits you. But don't get too comfortable.",
          "You're making Diamond look easy. Time for a real challenge?",
          "Consistently Diamond. You've definitely got the skills."
        ]);
        if (rs >= 42500) return this.getRandom([
          "Not bad, you're becoming a threat in Diamond.",
          "Making waves in Diamond! Keep it up.",
          "Diamond players are starting to notice you.",
          "You're rising through the Diamond ranks like a rocket.",
          "People in Diamond are starting to fear your name.",
          "You're carving a path through Diamond. Keep swinging!"
        ]);
        return this.getRandom([
          "Diamond status achieved. Welcome to the big leagues.",
          "You've made it to Diamond. Now the real grind begins.",
          "Sparkling in Diamond! Can you keep the shine?",
          "Diamond is just the beginning. Don't slow down.",
          "You're officially a Diamond player. Show them why.",
          "Welcome to the Diamond tier. The competition just got real."
        ]);
      }
      if (league === 'Ruby') {
        return this.getRandom([
          "The elite of the elite. You're a legend!",
          "Ruby rank! You're among the best in the world.",
          "Absolute god tier. How's the view from the top?",
          "You've conquered the leaderboard. Now defend it!",
          "The Top 500 isn't just a number, it's a lifestyle.",
          "You're playing a different game than the rest of us.",
          "Is it lonely at the top, or just very exclusive?",
          "Master class performance. Ruby looks perfect on you."
        ]);
      }
      if (league === 'Silver' || league === 'Bronze') {
        return this.getRandom([
          "Bronze/Silver? Are you playing with a steering wheel?",
          "I've seen bots with better rank scores. Get it together!",
          "Is this your first time using a controller? Or a mouse?",
          "Are you playing on a microwave? Those numbers are tragic.",
          "The tutorial is over, you know. You can start winning now.",
          "Even the practice range bots are laughing at this rank.",
          "Bronze life? My grandma plays better than this.",
          "Silver is just Bronze with a paint job. Aim higher!",
          "Are you trying to be the best at being the worst?",
          "I didn't know they made ranks this low.",
          "You're making the bottom of the leaderboard look crowded.",
          "Maybe try turning the monitor on next time?"
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
          "The grind is finally paying off!",
          "Absolute beast mode! Don't stop now!",
          "You're cooking with gas today!",
          "Is that a pro I see? Oh wait, it's just you popping off!",
          "Clean gains. Keep this energy!",
          "The leaderboard is shivering at your approach.",
          "You're on fire! Someone call the fire department!",
          "Pure skill on display. Keep climbing!",
          "Another day, another rank up. Easy work.",
          "You're making this look way too easy.",
          "The sky is the limit, and you're already flying.",
          "Keep this up and you'll be the one writing the taunts.",
          "Victory looks good on you. Get some more!"
        ]);
      } else {
        return this.getRandom([
          `${actualName} is actually cooking!`,
          `Watch out, ${actualName} is on a roll!`,
          `Impressive gains by ${actualName}.`,
          `Someone's been practicing! Good job ${actualName}.`,
          `${actualName} is climbing like their life depends on it!`,
          `Who invited the pro? ${actualName} is destroying the curve.`,
          `Unstoppable force: ${actualName} is on the rise.`,
          `Is ${actualName} cheating? Just kidding... unless?`,
          `${actualName} is leaving everyone in the dust.`,
          `Can anyone stop ${actualName}? Doesn't look like it.`,
          `Speedrunning the leaderboard, ${actualName}?`,
          `${actualName} is on a mission today.`,
          `Look at ${actualName} go! Absolute madman.`,
          `The grind is real for ${actualName}.`,
          `${actualName} is making moves that matter.`,
          `${actualName} is showing everyone how it's done.`
        ]);
      }
    } else {
      if (isSelf) {
        return this.getRandom([
          "Oh wow, you really tumbled down!",
          "Maybe take a break? This chart is painful to look at.",
          "Oof, that's a steep decline.",
          "Are you playing with your eyes closed?",
          "Did you forget how to use your hands?",
          "Gravity is a bitch, but you're making it look easy.",
          "That's not a chart, that's a crime scene.",
          "Maybe 'The Finals' isn't for everyone. Have you tried Minesweeper?",
          "I've seen more stability in a house of cards.",
          "Is the floor your new best friend?",
          "That's a lot of red on your chart. Everything okay?",
          "Maybe try playing with the monitor facing you?",
          "Your rank is sinking faster than the Titanic.",
          "Ouch. That's gotta hurt. Or are you used to it?",
          "If the goal was to lose points, you'd be a pro.",
          "You're making the competition's job way too easy."
        ]);
      } else {
        return this.getRandom([
          `Yikes, ${actualName} is falling off.`,
          `Rough times for ${actualName}.`,
          `Someone tell ${actualName} the goal is to go UP.`,
          `${actualName}'s chart looks like a ski slope.`,
          `Is ${actualName} trying to reach rank 0 from the wrong side?`,
          `Someone check on ${actualName}, they're in freefall.`,
          `I've seen better recovery from a literal crash. Get it together ${actualName}!`,
          `${actualName} is allergic to winning today.`,
          `${actualName} is currently taking the express elevator down.`,
          `Is ${actualName} playing in reverse?`,
          `${actualName}'s rank is going through a bit of a... crisis.`,
          `I didn't know ${actualName} was a fan of BASE jumping without a parachute.`,
          `The only thing ${actualName} is winning today is a trip to a lower league.`,
          `${actualName} is setting new records for rapid descent.`,
          `Stop, stop! ${actualName} is already down!`,
          `Does ${actualName} need a map to find the 'Win' button?`
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
        "The air must be thin up there.",
        "The elite squad is looking fierce.",
        "Witness greatness. Here are the top performers.",
        "The summit of skill. Look at them shine.",
        "The final bosses of the leaderboard.",
        "Legends in the making. Or already made.",
        "The top of the food chain is looking hungry.",
        "Bow down to the leaderboard royalty.",
        "The gold standard of gameplay.",
        "They've reached the peak. Can anyone knock them off?",
        "Absolute mastery on display right here.",
        "The best of the best. No questions asked.",
        "The leaderboard's shining stars."
      ]);
    }

    if (isInList) {
      return this.getRandom([
        "Looking good! You're in the world's elite.",
        "There you are! Keep climbing!",
        "A wild pro appeared in the rankings!",
        "Nice! You're making a name for yourself.",
        "Spotted! You're holding your ground among the best.",
        "Consistency is key, and you've got it!",
        "The world is watching. Nice placement!",
        "Keep this up and you'll be a household name.",
        "You're in the mix now. Don't let up!",
        "Ranked and dangerous. Keep it going!",
        "You've carved your name into the leaderboard.",
        "Spotted in the wild! A true competitor.",
        "You're holding your own against the world.",
        "A solid showing. Let's see you go higher!",
        "You're making your mark. Keep the pressure on!",
        "Recognized and ranked. Nice job!"
      ]);
    }

    return this.getRandom([
      "You'll never make it into this ranking at this rate.",
      "The view from the bottom must be nice too.",
      "Keep dreaming, maybe one day you'll be here.",
      "This is a restricted area for pros only.",
      "Maybe if you practice for 10,000 more hours?",
      "I scanned the list 10 times. You're still not on it.",
      "Error 404: Your skill not found in this leaderboard.",
      "Are you even trying, or just a spectator?",
      "You're like a ghost – completely invisible in the rankings.",
      "Don't worry, someone has to be at the bottom of the food chain.",
      "I've seen better rankings in a local bingo tournament.",
      "Maybe the leaderboard is hiding from you?",
      "You're playing hide and seek with the rankings. You're winning at hiding.",
      "Are you sure you're playing the same game as these people?",
      "This list is for champions. You... are also here. Somewhere else.",
      "I think you're looking for the participation trophy list.",
      "Ranked? More like 'pranked' if you think you're on here.",
      "You're so far down, I need a submarine to find you.",
      "Is your goal to be the most invisible player in the game?",
      "The leaderboard called. It doesn't know who you are."
    ]);
  }
}
