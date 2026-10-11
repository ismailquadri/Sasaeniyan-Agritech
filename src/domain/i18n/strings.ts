// Hausa-first string dictionary. Languages: ha (Hausa, default), pcm (Pidgin), en.
// Values may contain {placeholders} filled by vars passed to t().

export type Lang = 'ha' | 'pcm' | 'en'

type Dict = Record<string, string>

const ha: Dict = {
  welcome: 'Barka da zuwa Sasaeniyan',
  ussdMenu: 'Sasaeniyan\n1. Sayar da amfani\n2. Duba farashi\n3. Walat dina',
  chooseCrop: 'Zabi amfani:\n1. Tumatir\n2. Barkono\n3. Albasa',
  enterBaskets: 'Shigar da adadin kwando:',
  priceOffer: 'Farashin adalci: {price} kan kwando ({baskets} kwando). Dillali: {middleman}.\n1. Amince\n2. Soke',
  accepted: 'An amince. Jami\'i zai zo daukar amfani.',
  cancelled: 'An soke.',
  confirmPickup: 'An dauki amfaninka: {baskets} kwando {crop}.',
  paymentReceipt:
    'An biya ka. Sayarwa: {saleValue}. Cire bashi: {advance}. Kudin aiki: {fees}. Nasan hannunka: {payout}.',
  invalid: 'Zabi ba daidai ba. Sake gwadawa.',
  lotRejected: "An ki kwandon ka: {reason}. Jami'i zai sake duba. Ka tuntubi jami'inka.",
  reviewRequested: '{name} ya nemi sake duba kwandon da aka ki.',
}

const pcm: Dict = {
  welcome: 'Welcome to Sasaeniyan',
  ussdMenu: 'Sasaeniyan\n1. Sell your harvest\n2. Check price\n3. My wallet',
  chooseCrop: 'Choose crop:\n1. Tomato\n2. Pepper\n3. Onion',
  enterBaskets: 'Enter number of baskets:',
  priceOffer: 'Fair price: {price} per basket ({baskets} baskets). Middleman: {middleman}.\n1. Accept\n2. Cancel',
  accepted: 'You don accept. Agent go come carry your harvest.',
  cancelled: 'You don cancel.',
  confirmPickup: 'We don carry your harvest: {baskets} baskets {crop}.',
  paymentReceipt:
    'We don pay you. Sale: {saleValue}. Minus loan: {advance}. Charges: {fees}. Your money: {payout}.',
  invalid: 'Wrong choice. Try again.',
  lotRejected: 'We no fit accept your basket: {reason}. Talk to your agent.',
  reviewRequested: '{name} don ask make we check the rejected basket again.',
}

const en: Dict = {
  welcome: 'Welcome to Sasaeniyan',
  ussdMenu: 'Sasaeniyan\n1. Sell harvest\n2. Check price\n3. My wallet',
  chooseCrop: 'Choose crop:\n1. Tomato\n2. Pepper\n3. Onion',
  enterBaskets: 'Enter number of baskets:',
  priceOffer: 'Fair price: {price} per basket ({baskets} baskets). Middleman: {middleman}.\n1. Accept\n2. Cancel',
  accepted: 'Accepted. An agent will come to collect your harvest.',
  cancelled: 'Cancelled.',
  confirmPickup: 'Your harvest was collected: {baskets} baskets of {crop}.',
  paymentReceipt:
    'You have been paid. Sale: {saleValue}. Less advance: {advance}. Fees: {fees}. Your payout: {payout}.',
  invalid: 'Invalid choice. Please try again.',
  lotRejected: 'Your lot was rejected: {reason}. Contact your agent to review.',
  reviewRequested: '{name} requested a review of the rejected lot.',
}

const dicts: Record<Lang, Dict> = { ha, pcm, en }

export function t(key: string, lang: Lang = 'ha', vars: Record<string, string | number> = {}): string {
  const dict = dicts[lang] ?? ha
  let s = dict[key] ?? ha[key] ?? key
  for (const [k, v] of Object.entries(vars)) {
    s = s.replaceAll(`{${k}}`, String(v))
  }
  return s
}
