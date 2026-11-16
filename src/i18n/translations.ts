export type EdisonLocaleCode = 'en' | 'sn' | 'nd' | 'zu' | 'fr' | 'de' | 'pt' | 'es' | 'sw';

export interface EdisonUiTranslationBundle {
  locale: EdisonLocaleCode;
  languageName: string;
  consentBannerTitle: string;
  consentBannerNotice: string;
  qrScanPrompt: string;
  ordinaryTvReturnNotice: string;
  charityFreeNotice: string;
  noOutcomeGuaranteeNotice: string;
}

export const EDISON_I18N_BUNDLES: Record<EdisonLocaleCode, EdisonUiTranslationBundle> = {
  en: {
    locale: 'en',
    languageName: 'English',
    consentBannerTitle: 'Household Advertising & Opportunity Consent (Optional)',
    consentBannerNotice:
      'You can withdraw consent at any time. Ordinary live television remains completely free and usable if you withdraw.',
    qrScanPrompt: 'Scan the QR code with your mobile phone to open the verified destination.',
    ordinaryTvReturnNotice: 'Returning to live television now.',
    charityFreeNotice: 'EDISON never charges viewers to scan or apply for listed opportunities.',
    noOutcomeGuaranteeNotice: 'Listing an opportunity does not guarantee employment, funding, or admission.',
  },
  sn: {
    locale: 'sn',
    languageName: 'ChiShona',
    consentBannerTitle: 'Mvumo Yezviziviso Nezvemikana Mumba (Yekuzvisarudzira)',
    consentBannerNotice:
      'Munogona kubvisa mvumo chero nguva. Terevhizheni yenyu yemazuva ose inoramba ichishanda zvakajairika pasina mubhadharo.',
    qrScanPrompt: 'Skanai QR code nenharembozha yenyu kuti muone mashoko akazara.',
    ordinaryTvReturnNotice: 'Kudzokera kuTV yenyu yemazuva ose iye zvino.',
    charityFreeNotice: 'EDISON haibhadharisi vataridzi kana vashandisi mari yekusvika kana kunyorera mikana.',
    noOutcomeGuaranteeNotice: 'Kuratidzwa kwemukana hakurevi kuvimbiswa kwebasa kana rubatsiro.',
  },
  nd: {
    locale: 'nd',
    languageName: 'IsiNdebele',
    consentBannerTitle: 'Imvume Yezikhangiso Lamathuba Emzini (Ukuzikhethela)',
    consentBannerNotice:
      'Lingahoxisa imvume nganoma yisiphi isikhathi. I-TV yenu yansuku zonke izahlala isebenza njengokujwayelekileyo.',
    qrScanPrompt: 'Skenani ikhodi ye-QR ngefoni yenu ukuthi livule imininingwane eqinisekisiweyo.',
    ordinaryTvReturnNotice: 'Sibuyela kumabonakude wenu ojwayelekileyo khathesi.',
    charityFreeNotice: 'I-EDISON ayibhadalisi ababukeli ukuvula noma ukufaka isicelo samathuba.',
    noOutcomeGuaranteeNotice: 'Ukukhangiswa kwethuba akutsho isiqiniseko somsebenzi noma uncedo.',
  },
  zu: {
    locale: 'zu',
    languageName: 'isiZulu',
    consentBannerTitle: 'Imvume Yezikhangiso Namathuba Ekhaya (Ongazikhethela)',
    consentBannerNotice:
      'Ungahoxisa imvume noma nini. I-TV yakho evamile izoqhubeka isebenza ngokujwayelekile ngaphandle kokuphazamiseka.',
    qrScanPrompt: 'Skena ikhodi ye-QR ngefoni yakho ukuze uvule ikhasi eliqinisekisiwe.',
    ordinaryTvReturnNotice: 'Sibuyela kumabonakude oqhubekayo manje.',
    charityFreeNotice: 'I-EDISON ayibizi mali kubabukeli ukuze bahlole noma bafake izicelo zamathuba.',
    noOutcomeGuaranteeNotice: 'Ukukhangiswa kwethuba akuqinisekisi umsebenzi noma uxhaso.',
  },
  fr: {
    locale: 'fr',
    languageName: 'Français',
    consentBannerTitle: 'Consentement Publicitaire et Opportunités du Foyer (Optionnel)',
    consentBannerNotice:
      'Vous pouvez retirer votre consentement à tout moment. La télévision en direct ordinaire reste pleinement utilisable.',
    qrScanPrompt: 'Scannez le code QR avec votre téléphone mobile pour ouvrir la destination vérifiée.',
    ordinaryTvReturnNotice: 'Retour au programme télévisé en direct.',
    charityFreeNotice: 'EDISON ne facture jamais les téléspectateurs pour accéder aux opportunités.',
    noOutcomeGuaranteeNotice: 'Une annonce vérifiée ne garantit ni embauche ni financement.',
  },
  de: {
    locale: 'de',
    languageName: 'Deutsch',
    consentBannerTitle: 'Haushalts-Einwilligung für Werbung und Chancen (Optional)',
    consentBannerNotice:
      'Sie können Ihre Einwilligung jederzeit widerrufen. Das reguläre Live-Fernsehen bleibt uneingeschränkt nutzbar.',
    qrScanPrompt: 'Scannen Sie den QR-Code mit Ihrem Mobiltelefon, um das verifizierte Ziel zu öffnen.',
    ordinaryTvReturnNotice: 'Rückkehr zum regulären Live-Fernsehen.',
    charityFreeNotice: 'EDISON erhebt keine Gebühren für das Aufrufen oder Bewerben auf gelistete Chancen.',
    noOutcomeGuaranteeNotice: 'Ein Eintrag garantiert keine Anstellung, Förderung oder Zusage.',
  },
  pt: {
    locale: 'pt',
    languageName: 'Português',
    consentBannerTitle: 'Consentimento de Publicidade e Oportunidades do Agregado (Opcional)',
    consentBannerNotice:
      'Pode retirar o consentimento a qualquer momento. A televisão em direto habitual permanece totalmente funcional.',
    qrScanPrompt: 'Leia o código QR com o seu telemóvel para abrir o destino verificado.',
    ordinaryTvReturnNotice: 'A regressar à emissão televisiva habitual.',
    charityFreeNotice: 'A EDISON nunca cobra aos espetadores para aceder ou candidatar-se a oportunidades.',
    noOutcomeGuaranteeNotice: 'A divulgação de uma oportunidade não garante emprego nem financiamento.',
  },
  es: {
    locale: 'es',
    languageName: 'Español',
    consentBannerTitle: 'Consentimiento del Hogar para Publicidad y Oportunidades (Opcional)',
    consentBannerNotice:
      'Puede retirar su consentimiento en cualquier momento. La televisión en vivo habitual seguirá funcionando con normalidad.',
    qrScanPrompt: 'Escanee el código QR con su teléfono móvil para abrir el destino verificado.',
    ordinaryTvReturnNotice: 'Volviendo a la televisión en vivo habitual.',
    charityFreeNotice: 'EDISON nunca cobra a los espectadores por acceder o postularse a oportunidades.',
    noOutcomeGuaranteeNotice: 'La publicación no garantiza empleo, beca ni financiación.',
  },
  sw: {
    locale: 'sw',
    languageName: 'Kiswahili',
    consentBannerTitle: 'Idhini ya Matangazo na Fursa Nyumbani (Si Lazima)',
    consentBannerNotice:
      'Unaweza kuondoa idhini yako wakati wowote. Televisheni yako ya kawaida itaendelea kufanya kazi bila kizuizi.',
    qrScanPrompt: 'Skani msimbo wa QR kwa simu yako kufungua ukurasa uliothibitishwa.',
    ordinaryTvReturnNotice: 'Inarudi kwenye matangazo ya kawaida ya TV sasa.',
    charityFreeNotice: 'EDISON haitozi watazamaji ada yoyote kuona au kuomba fursa zilizoorodheshwa.',
    noOutcomeGuaranteeNotice: 'Kuorodheshwa kwa fursa hakutoi hakikisho la ajira au ufadhili.',
  },
};

export function getTranslationBundle(locale?: string): EdisonUiTranslationBundle {
  const normalized = (locale || 'en').toLowerCase().slice(0, 2) as EdisonLocaleCode;
  return EDISON_I18N_BUNDLES[normalized] ?? EDISON_I18N_BUNDLES.en;
}
