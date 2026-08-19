const BAD_WORDS = [
  'ass','asshole','bastard','bitch','bollocks','bullshit','cock','crap','cunt',
  'damn','dick','douchebag','fag','fuck','fucker','fucking','goddamn','hell',
  'jackass','motherfucker','nigger','piss','prick','pussy','shit','slut',
  'twat','wanker','whore',
];

const PATTERN = new RegExp(
  '\\b(' + BAD_WORDS.join('|') + ')\\b',
  'i'
);

export function containsProfanity(text: string): boolean {
  return PATTERN.test(text);
}
