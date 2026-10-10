// USSD session state machine: pure reducer (step → prompt → input).
// Pricing isn't known here; the API layer fills {price}/{middleman} when it
// builds the real offer SMS. Prompts default to Hausa via i18n.

import { t, type Lang } from '../i18n/strings'

export interface UssdSession {
  step: 'menu' | 'crop' | 'baskets' | 'offer' | 'done'
  lang: Lang
  crop?: string
  baskets?: number
}

export interface AcceptHarvest {
  type: 'ACCEPT_HARVEST'
  crop: string
  baskets: number
}

export interface UssdResult {
  session: UssdSession
  prompt: string
  action?: AcceptHarvest
}

export interface UssdCtx {
  price?: string
  middleman?: string
}

const CROPS: Record<string, string> = { '1': 'tomato', '2': 'pepper', '3': 'onion' }

export function newSession(lang: Lang = 'ha'): UssdSession {
  return { step: 'menu', lang }
}

export function ussdStep(session: UssdSession, input: string, ctx: UssdCtx = {}): UssdResult {
  const lang = session.lang
  const trimmed = (input ?? '').trim()

  switch (session.step) {
    case 'menu': {
      if (trimmed === '') return { session, prompt: t('ussdMenu', lang) }
      if (trimmed === '1') return { session: { ...session, step: 'crop' }, prompt: t('chooseCrop', lang) }
      return { session, prompt: t('invalid', lang) + '\n' + t('ussdMenu', lang) }
    }
    case 'crop': {
      const crop = CROPS[trimmed]
      if (!crop) return { session, prompt: t('invalid', lang) + '\n' + t('chooseCrop', lang) }
      return { session: { ...session, step: 'baskets', crop }, prompt: t('enterBaskets', lang) }
    }
    case 'baskets': {
      const n = Number.parseInt(trimmed, 10)
      if (!Number.isInteger(n) || n <= 0) {
        return { session, prompt: t('invalid', lang) + '\n' + t('enterBaskets', lang) }
      }
      const next: UssdSession = { ...session, step: 'offer', baskets: n }
      const prompt = t('priceOffer', lang, {
        price: ctx.price ?? '—',
        baskets: n,
        middleman: ctx.middleman ?? '—',
      })
      return { session: next, prompt }
    }
    case 'offer': {
      if (trimmed === '1') {
        return {
          session: { ...session, step: 'done' },
          prompt: t('accepted', lang),
          action: { type: 'ACCEPT_HARVEST', crop: session.crop!, baskets: session.baskets! },
        }
      }
      if (trimmed === '2') {
        return { session: newSession(lang), prompt: t('cancelled', lang) }
      }
      const prompt = t('priceOffer', lang, {
        price: ctx.price ?? '—',
        baskets: session.baskets ?? 0,
        middleman: ctx.middleman ?? '—',
      })
      return { session, prompt: t('invalid', lang) + '\n' + prompt }
    }
    case 'done':
    default:
      return { session, prompt: t('accepted', lang) }
  }
}
