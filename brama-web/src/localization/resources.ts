export const languageCodes = ['pl', 'fr', 'en', 'es', 'cs', 'uk'] as const

export type LanguageCode = (typeof languageCodes)[number]

export const languageFlags: Record<LanguageCode, string> = {
  pl: '🇵🇱',
  fr: '🇫🇷',
  en: '🇬🇧',
  es: '🇪🇸',
  cs: '🇨🇿',
  uk: '🇺🇦',
}

export const languageNames: Record<LanguageCode, string> = {
  pl: 'Polski',
  fr: 'Français',
  en: 'English',
  es: 'Español',
  cs: 'Čeština',
  uk: 'Українська',
}

export const defaultLanguage: LanguageCode = 'en'

export const resources = {
  en: {
    translation: {
      meta: {
        title: 'Brama | Lublin City Services Assistant',
        description: 'Brama is a modern AI assistance platform for Lublin city services.',
      },
      navigation: {
        headerLabel: 'Brama platform navigation',
        homeLabel: 'Brama home',
        mainLabel: 'Main navigation',
        languageLabel: 'Language',
        platform: 'Platform',
        services: 'Services',
        trust: 'Trust',
        kit: 'Kit',
      },
      hero: {
        eyebrow: 'AI assistance for Lublin city services',
        title: 'Brama for Lublin services',
        lede: 'A modern web platform that helps residents understand public procedures, prepare documents, find the right office path, and move from question to action with confidence.',
        rotatorPrefix: 'Guidance for',
        rotatorLabel: 'Guidance for documents, appointments, benefits, and city notices',
        actionsLabel: 'Primary actions',
        primaryAction: 'Explore platform',
        secondaryAction: 'See service areas',
        visualLabel: 'Lublin-inspired civic platform preview',
        imageAlt: 'Lublin-inspired civic digital assistant interface framed by a modern gate motif',
      },
      assistantPreview: {
        label: 'Assistant preview',
        question: 'How can I renew a document in Lublin?',
        answer: 'Requirements, offices, forms, and next steps',
      },
      platform: {
        eyebrow: 'Platform purpose',
        title: 'A practical digital gate into city procedures.',
        features: {
          guided: {
            title: 'Guided civic tasks',
            description:
              'Brama turns city-service questions into clear steps, required documents, office contacts, and next actions.',
          },
          local: {
            title: 'Locally aware answers',
            description:
              'The platform is shaped around Lublin residents, city procedures, multilingual needs, and trusted public sources.',
          },
          handoff: {
            title: 'Human handoff ready',
            description:
              'When a matter needs official confirmation, Brama points people toward the right office, form, or channel.',
          },
        },
      },
      services: {
        eyebrow: 'Resident support',
        title: 'Designed around everyday city questions.',
        body: 'Brama focuses on common public-service moments where residents need certainty: documents, visits, deadlines, eligibility, city information, and recovery paths when an online answer is not enough.',
        listLabel: 'Supported service areas',
        areas: {
          documents: 'Documents and certificates',
          appointments: 'Appointments and office visits',
          benefits: 'Benefits and resident support',
          transport: 'Transport and city notices',
        },
      },
      trust: {
        eyebrow: 'Trust model',
        title: 'Helpful by default, careful where authority matters.',
        processLabel: 'How Brama guides residents',
        steps: {
          ask: 'Ask in plain language',
          review: 'Review verified guidance',
          continue: 'Continue with the correct city action',
        },
      },
      cta: {
        title: 'Built for a calmer public-service experience.',
        body: 'Brama combines a Lublin-coded visual language with accessible product design, so residents can start with a question and leave with a next step.',
        action: 'Back to start',
      },
      kit: {
        eyebrow: 'UI kit',
        title: 'Shared primitives for the Brama interface.',
        body: 'Buttons, inputs, text styles, badges, and cards now share one token-driven component layer for civic workflows and future assistant screens.',
        cards: {
          actions: {
            badge: 'Actions',
            title: 'Buttons',
            primary: 'Primary',
            secondary: 'Secondary',
            quiet: 'Quiet',
          },
          text: {
            badge: 'Text',
            title: 'Typography',
            body: 'Body copy stays readable, compact, and ready for longer Polish or Ukrainian service labels.',
            status: 'Verified next step available',
          },
          status: {
            badge: 'Status',
            title: 'Badges',
            draft: 'Draft',
            review: 'Review',
            urgent: 'Urgent',
          },
        },
        form: {
          label: 'Form control examples',
          questionLabel: 'Question',
          questionDescription: 'Example resident-service query field.',
          questionPlaceholder: 'How do I book an office visit?',
          areaLabel: 'Service area',
          contextLabel: 'Additional context',
          contextPlaceholder: 'Add deadlines, office names, or language needs.',
          officialLabel: 'Show official-source handoff when available',
        },
      },
    },
  },
  pl: {
    translation: {
      meta: {
        title: 'Brama | Asystent usług miejskich Lublina',
        description: 'Brama to nowoczesna platforma wsparcia AI dla usług miejskich Lublina.',
      },
      navigation: {
        headerLabel: 'Nawigacja platformy Brama',
        homeLabel: 'Strona główna Brama',
        mainLabel: 'Nawigacja główna',
        languageLabel: 'Język',
        platform: 'Platforma',
        services: 'Usługi',
        trust: 'Zaufanie',
        kit: 'Zestaw UI',
      },
      hero: {
        eyebrow: 'Wsparcie AI dla usług miejskich Lublina',
        title: 'Brama dla usług Lublina',
        lede: 'Nowoczesna platforma internetowa, która pomaga mieszkańcom zrozumieć procedury publiczne, przygotować dokumenty, znaleźć właściwą ścieżkę urzędową i pewnie przejść od pytania do działania.',
        rotatorPrefix: 'Pomoc przy',
        rotatorLabel: 'Pomoc przy dokumentach, wizytach, świadczeniach i komunikatach miejskich',
        actionsLabel: 'Główne działania',
        primaryAction: 'Poznaj platformę',
        secondaryAction: 'Zobacz obszary usług',
        visualLabel: 'Podgląd platformy miejskiej inspirowanej Lublinem',
        imageAlt: 'Interfejs miejskiego asystenta cyfrowego inspirowany Lublinem, ujęty w nowoczesny motyw bramy',
      },
      assistantPreview: {
        label: 'Podgląd asystenta',
        question: 'Jak odnowić dokument w Lublinie?',
        answer: 'Wymagania, urzędy, formularze i kolejne kroki',
      },
      platform: {
        eyebrow: 'Cel platformy',
        title: 'Praktyczna cyfrowa brama do miejskich procedur.',
        features: {
          guided: {
            title: 'Prowadzenie przez sprawy',
            description:
              'Brama zamienia pytania o usługi miejskie w jasne kroki, wymagane dokumenty, kontakty do urzędów i następne działania.',
          },
          local: {
            title: 'Odpowiedzi osadzone lokalnie',
            description:
              'Platforma jest projektowana wokół mieszkańców Lublina, miejskich procedur, potrzeb wielojęzycznych i zaufanych źródeł publicznych.',
          },
          handoff: {
            title: 'Gotowość do kontaktu z człowiekiem',
            description:
              'Gdy sprawa wymaga oficjalnego potwierdzenia, Brama wskazuje właściwy urząd, formularz lub kanał kontaktu.',
          },
        },
      },
      services: {
        eyebrow: 'Wsparcie mieszkańców',
        title: 'Zaprojektowana wokół codziennych pytań o miasto.',
        body: 'Brama koncentruje się na typowych momentach korzystania z usług publicznych, w których mieszkańcy potrzebują pewności: dokumentach, wizytach, terminach, uprawnieniach, informacjach miejskich i ścieżkach działania, gdy odpowiedź online nie wystarcza.',
        listLabel: 'Obsługiwane obszary usług',
        areas: {
          documents: 'Dokumenty i zaświadczenia',
          appointments: 'Terminy i wizyty w urzędzie',
          benefits: 'Świadczenia i wsparcie mieszkańców',
          transport: 'Transport i komunikaty miejskie',
        },
      },
      trust: {
        eyebrow: 'Model zaufania',
        title: 'Pomocna domyślnie, ostrożna tam, gdzie liczy się autorytet.',
        processLabel: 'Jak Brama prowadzi mieszkańców',
        steps: {
          ask: 'Zadaj pytanie zwykłym językiem',
          review: 'Sprawdź zweryfikowane wskazówki',
          continue: 'Przejdź do właściwego działania w mieście',
        },
      },
      cta: {
        title: 'Stworzona dla spokojniejszego doświadczenia usług publicznych.',
        body: 'Brama łączy lubelski język wizualny z dostępnym projektowaniem produktu, aby mieszkańcy mogli zacząć od pytania i wyjść z konkretnym następnym krokiem.',
        action: 'Wróć na początek',
      },
      kit: {
        eyebrow: 'Zestaw UI',
        title: 'Wspólne elementy interfejsu Bramy.',
        body: 'Przyciski, pola, style tekstu, odznaki i karty korzystają teraz z jednej warstwy komponentów opartej na tokenach dla miejskich procesów i przyszłych ekranów asystenta.',
        cards: {
          actions: {
            badge: 'Działania',
            title: 'Przyciski',
            primary: 'Główny',
            secondary: 'Drugorzędny',
            quiet: 'Cichy',
          },
          text: {
            badge: 'Tekst',
            title: 'Typografia',
            body: 'Tekst pozostaje czytelny, zwarty i gotowy na dłuższe polskie lub ukraińskie etykiety usług.',
            status: 'Zweryfikowany następny krok dostępny',
          },
          status: {
            badge: 'Status',
            title: 'Odznaki',
            draft: 'Szkic',
            review: 'Przegląd',
            urgent: 'Pilne',
          },
        },
        form: {
          label: 'Przykłady kontrolek formularza',
          questionLabel: 'Pytanie',
          questionDescription: 'Przykładowe pole zapytania o usługę mieszkańca.',
          questionPlaceholder: 'Jak umówić wizytę w urzędzie?',
          areaLabel: 'Obszar usługi',
          contextLabel: 'Dodatkowy kontekst',
          contextPlaceholder: 'Dodaj terminy, nazwy urzędów lub potrzeby językowe.',
          officialLabel: 'Pokaż przekazanie do oficjalnego źródła, gdy jest dostępne',
        },
      },
    },
  },
  fr: {
    translation: {
      meta: {
        title: 'Brama | Assistant des services municipaux de Lublin',
        description: "Brama est une plateforme moderne d'assistance IA pour les services municipaux de Lublin.",
      },
      navigation: {
        headerLabel: 'Navigation de la plateforme Brama',
        homeLabel: 'Accueil Brama',
        mainLabel: 'Navigation principale',
        languageLabel: 'Langue',
        platform: 'Plateforme',
        services: 'Services',
        trust: 'Confiance',
        kit: 'Kit UI',
      },
      hero: {
        eyebrow: 'Assistance IA pour les services municipaux de Lublin',
        title: 'Brama pour les services de Lublin',
        lede: "Une plateforme web moderne qui aide les habitants à comprendre les procédures publiques, préparer les documents, trouver le bon parcours administratif et passer de la question à l'action avec confiance.",
        rotatorPrefix: 'Guidage pour',
        rotatorLabel: 'Guidage pour les documents, rendez-vous, prestations et avis municipaux',
        actionsLabel: 'Actions principales',
        primaryAction: 'Explorer la plateforme',
        secondaryAction: 'Voir les services',
        visualLabel: 'Aperçu de plateforme civique inspirée de Lublin',
        imageAlt: "Interface d'assistant civique numérique inspirée de Lublin, encadrée par un motif de porte moderne",
      },
      assistantPreview: {
        label: "Aperçu de l'assistant",
        question: 'Comment renouveler un document à Lublin ?',
        answer: 'Conditions, bureaux, formulaires et prochaines étapes',
      },
      platform: {
        eyebrow: 'Rôle de la plateforme',
        title: 'Une porte numérique pratique vers les procédures municipales.',
        features: {
          guided: {
            title: 'Démarches civiques guidées',
            description:
              'Brama transforme les questions sur les services municipaux en étapes claires, documents requis, contacts utiles et prochaines actions.',
          },
          local: {
            title: 'Réponses ancrées localement',
            description:
              'La plateforme est pensée pour les habitants de Lublin, les procédures municipales, les besoins multilingues et les sources publiques fiables.',
          },
          handoff: {
            title: 'Relais humain prêt',
            description:
              'Lorsqu’une question exige une confirmation officielle, Brama oriente vers le bon bureau, formulaire ou canal.',
          },
        },
      },
      services: {
        eyebrow: 'Soutien aux habitants',
        title: 'Conçue autour des questions municipales du quotidien.',
        body: "Brama se concentre sur les moments courants où les habitants ont besoin de certitude : documents, rendez-vous, délais, éligibilité, informations municipales et solutions lorsque la réponse en ligne ne suffit pas.",
        listLabel: 'Domaines de services pris en charge',
        areas: {
          documents: 'Documents et certificats',
          appointments: 'Rendez-vous et visites administratives',
          benefits: 'Prestations et soutien aux habitants',
          transport: 'Transports et avis municipaux',
        },
      },
      trust: {
        eyebrow: 'Modèle de confiance',
        title: "Utile par défaut, prudente lorsque l'autorité compte.",
        processLabel: 'Comment Brama guide les habitants',
        steps: {
          ask: 'Poser une question simplement',
          review: 'Consulter des conseils vérifiés',
          continue: 'Continuer avec la bonne action municipale',
        },
      },
      cta: {
        title: 'Créée pour une expérience des services publics plus sereine.',
        body: "Brama associe un langage visuel inspiré de Lublin à un design accessible, afin que les habitants partent d'une question et repartent avec une prochaine étape.",
        action: 'Retour au début',
      },
      kit: {
        eyebrow: 'Kit UI',
        title: "Composants partagés pour l'interface Brama.",
        body: "Boutons, champs, styles de texte, badges et cartes partagent désormais une couche de composants pilotée par les tokens pour les parcours civiques et les futurs écrans d'assistant.",
        cards: {
          actions: {
            badge: 'Actions',
            title: 'Boutons',
            primary: 'Principal',
            secondary: 'Secondaire',
            quiet: 'Discret',
          },
          text: {
            badge: 'Texte',
            title: 'Typographie',
            body: 'Le texte reste lisible, compact et prêt pour des libellés de services polonais ou ukrainiens plus longs.',
            status: 'Prochaine étape vérifiée disponible',
          },
          status: {
            badge: 'Statut',
            title: 'Badges',
            draft: 'Brouillon',
            review: 'Revue',
            urgent: 'Urgent',
          },
        },
        form: {
          label: 'Exemples de contrôles de formulaire',
          questionLabel: 'Question',
          questionDescription: 'Exemple de champ de requête pour un service aux habitants.',
          questionPlaceholder: 'Comment réserver une visite au bureau ?',
          areaLabel: 'Domaine de service',
          contextLabel: 'Contexte supplémentaire',
          contextPlaceholder: 'Ajoutez des délais, noms de bureaux ou besoins linguistiques.',
          officialLabel: 'Afficher le relais vers une source officielle lorsqu’il est disponible',
        },
      },
    },
  },
  es: {
    translation: {
      meta: {
        title: 'Brama | Asistente de servicios municipales de Lublin',
        description: 'Brama es una plataforma moderna de asistencia con IA para los servicios municipales de Lublin.',
      },
      navigation: {
        headerLabel: 'Navegación de la plataforma Brama',
        homeLabel: 'Inicio de Brama',
        mainLabel: 'Navegación principal',
        languageLabel: 'Idioma',
        platform: 'Plataforma',
        services: 'Servicios',
        trust: 'Confianza',
        kit: 'Kit UI',
      },
      hero: {
        eyebrow: 'Asistencia con IA para los servicios municipales de Lublin',
        title: 'Brama para los servicios de Lublin',
        lede: 'Una plataforma web moderna que ayuda a los residentes a entender los trámites públicos, preparar documentos, encontrar la ruta administrativa adecuada y pasar de la pregunta a la acción con confianza.',
        rotatorPrefix: 'Orientación para',
        rotatorLabel: 'Orientación para documentos, citas, prestaciones y avisos municipales',
        actionsLabel: 'Acciones principales',
        primaryAction: 'Explorar plataforma',
        secondaryAction: 'Ver áreas de servicio',
        visualLabel: 'Vista previa de una plataforma cívica inspirada en Lublin',
        imageAlt: 'Interfaz de asistente cívico digital inspirada en Lublin y enmarcada por un motivo moderno de puerta',
      },
      assistantPreview: {
        label: 'Vista previa del asistente',
        question: '¿Cómo puedo renovar un documento en Lublin?',
        answer: 'Requisitos, oficinas, formularios y próximos pasos',
      },
      platform: {
        eyebrow: 'Propósito de la plataforma',
        title: 'Una puerta digital práctica hacia los procedimientos municipales.',
        features: {
          guided: {
            title: 'Trámites cívicos guiados',
            description:
              'Brama convierte las preguntas sobre servicios municipales en pasos claros, documentos requeridos, contactos de oficina y próximas acciones.',
          },
          local: {
            title: 'Respuestas con contexto local',
            description:
              'La plataforma está diseñada en torno a los residentes de Lublin, los procedimientos municipales, las necesidades multilingües y las fuentes públicas confiables.',
          },
          handoff: {
            title: 'Lista para derivación humana',
            description:
              'Cuando un asunto necesita confirmación oficial, Brama orienta hacia la oficina, el formulario o el canal adecuado.',
          },
        },
      },
      services: {
        eyebrow: 'Apoyo a residentes',
        title: 'Diseñada alrededor de las preguntas cotidianas de la ciudad.',
        body: 'Brama se centra en momentos comunes de los servicios públicos en los que los residentes necesitan certeza: documentos, visitas, plazos, elegibilidad, información municipal y vías de recuperación cuando una respuesta en línea no basta.',
        listLabel: 'Áreas de servicio admitidas',
        areas: {
          documents: 'Documentos y certificados',
          appointments: 'Citas y visitas a oficinas',
          benefits: 'Prestaciones y apoyo a residentes',
          transport: 'Transporte y avisos municipales',
        },
      },
      trust: {
        eyebrow: 'Modelo de confianza',
        title: 'Útil por defecto, cuidadosa donde importa la autoridad.',
        processLabel: 'Cómo Brama guía a los residentes',
        steps: {
          ask: 'Pregunta con lenguaje sencillo',
          review: 'Revisa orientación verificada',
          continue: 'Continúa con la acción municipal correcta',
        },
      },
      cta: {
        title: 'Creada para una experiencia de servicios públicos más tranquila.',
        body: 'Brama combina un lenguaje visual ligado a Lublin con diseño de producto accesible, para que los residentes puedan empezar con una pregunta y salir con un próximo paso.',
        action: 'Volver al inicio',
      },
      kit: {
        eyebrow: 'Kit UI',
        title: 'Componentes compartidos para la interfaz de Brama.',
        body: 'Botones, campos, estilos de texto, insignias y tarjetas ahora comparten una capa de componentes basada en tokens para flujos cívicos y futuras pantallas del asistente.',
        cards: {
          actions: {
            badge: 'Acciones',
            title: 'Botones',
            primary: 'Principal',
            secondary: 'Secundario',
            quiet: 'Discreto',
          },
          text: {
            badge: 'Texto',
            title: 'Tipografía',
            body: 'El texto se mantiene legible, compacto y preparado para etiquetas de servicio polacas o ucranianas más largas.',
            status: 'Siguiente paso verificado disponible',
          },
          status: {
            badge: 'Estado',
            title: 'Insignias',
            draft: 'Borrador',
            review: 'Revisión',
            urgent: 'Urgente',
          },
        },
        form: {
          label: 'Ejemplos de controles de formulario',
          questionLabel: 'Pregunta',
          questionDescription: 'Campo de ejemplo para una consulta de servicio a residentes.',
          questionPlaceholder: '¿Cómo reservo una visita a la oficina?',
          areaLabel: 'Área de servicio',
          contextLabel: 'Contexto adicional',
          contextPlaceholder: 'Añade plazos, nombres de oficinas o necesidades lingüísticas.',
          officialLabel: 'Mostrar derivación a fuente oficial cuando esté disponible',
        },
      },
    },
  },
  cs: {
    translation: {
      meta: {
        title: 'Brama | Asistent městských služeb Lublinu',
        description: 'Brama je moderní platforma asistence AI pro městské služby Lublinu.',
      },
      navigation: {
        headerLabel: 'Navigace platformy Brama',
        homeLabel: 'Domů Brama',
        mainLabel: 'Hlavní navigace',
        languageLabel: 'Jazyk',
        platform: 'Platforma',
        services: 'Služby',
        trust: 'Důvěra',
        kit: 'UI sada',
      },
      hero: {
        eyebrow: 'Asistence AI pro městské služby Lublinu',
        title: 'Brama pro služby Lublinu',
        lede: 'Moderní webová platforma, která obyvatelům pomáhá porozumět veřejným postupům, připravit dokumenty, najít správnou úřední cestu a sebejistě přejít od otázky k akci.',
        rotatorPrefix: 'Pomoc s',
        rotatorLabel: 'Pomoc s dokumenty, termíny, dávkami a městskými oznámeními',
        actionsLabel: 'Hlavní akce',
        primaryAction: 'Prozkoumat platformu',
        secondaryAction: 'Zobrazit oblasti služeb',
        visualLabel: 'Náhled občanské platformy inspirované Lublinem',
        imageAlt: 'Rozhraní digitálního občanského asistenta inspirované Lublinem v moderním motivu brány',
      },
      assistantPreview: {
        label: 'Náhled asistenta',
        question: 'Jak mohu v Lublinu obnovit dokument?',
        answer: 'Požadavky, úřady, formuláře a další kroky',
      },
      platform: {
        eyebrow: 'Účel platformy',
        title: 'Praktická digitální brána k městským postupům.',
        features: {
          guided: {
            title: 'Vedení občanskými úkoly',
            description:
              'Brama mění otázky o městských službách na jasné kroky, potřebné dokumenty, kontakty na úřady a další akce.',
          },
          local: {
            title: 'Odpovědi s místním kontextem',
            description:
              'Platforma je navržena kolem obyvatel Lublinu, městských postupů, vícejazyčných potřeb a důvěryhodných veřejných zdrojů.',
          },
          handoff: {
            title: 'Připraveno na lidské předání',
            description:
              'Když záležitost vyžaduje oficiální potvrzení, Brama nasměruje na správný úřad, formulář nebo kanál.',
          },
        },
      },
      services: {
        eyebrow: 'Podpora obyvatel',
        title: 'Navrženo kolem každodenních otázek o městě.',
        body: 'Brama se zaměřuje na běžné situace veřejných služeb, ve kterých obyvatelé potřebují jistotu: dokumenty, návštěvy, termíny, nárok, městské informace a další postupy, když online odpověď nestačí.',
        listLabel: 'Podporované oblasti služeb',
        areas: {
          documents: 'Dokumenty a potvrzení',
          appointments: 'Termíny a návštěvy úřadů',
          benefits: 'Dávky a podpora obyvatel',
          transport: 'Doprava a městská oznámení',
        },
      },
      trust: {
        eyebrow: 'Model důvěry',
        title: 'Užitečná ve výchozím nastavení, opatrná tam, kde záleží na autoritě.',
        processLabel: 'Jak Brama vede obyvatele',
        steps: {
          ask: 'Zeptejte se běžným jazykem',
          review: 'Projděte si ověřené pokyny',
          continue: 'Pokračujte správnou městskou akcí',
        },
      },
      cta: {
        title: 'Vytvořeno pro klidnější zkušenost s veřejnými službami.',
        body: 'Brama kombinuje vizuální jazyk spojený s Lublinem s dostupným produktovým designem, aby obyvatelé mohli začít otázkou a odejít s dalším krokem.',
        action: 'Zpět na začátek',
      },
      kit: {
        eyebrow: 'UI sada',
        title: 'Sdílené prvky rozhraní Brama.',
        body: 'Tlačítka, pole, textové styly, štítky a karty nyní sdílejí jednu komponentovou vrstvu založenou na tokenech pro občanské postupy a budoucí obrazovky asistenta.',
        cards: {
          actions: {
            badge: 'Akce',
            title: 'Tlačítka',
            primary: 'Primární',
            secondary: 'Sekundární',
            quiet: 'Tiché',
          },
          text: {
            badge: 'Text',
            title: 'Typografie',
            body: 'Text zůstává čitelný, kompaktní a připravený na delší polské nebo ukrajinské štítky služeb.',
            status: 'Ověřený další krok je k dispozici',
          },
          status: {
            badge: 'Stav',
            title: 'Štítky',
            draft: 'Koncept',
            review: 'Kontrola',
            urgent: 'Naléhavé',
          },
        },
        form: {
          label: 'Příklady formulářových prvků',
          questionLabel: 'Otázka',
          questionDescription: 'Ukázkové pole dotazu na službu pro obyvatele.',
          questionPlaceholder: 'Jak si rezervuji návštěvu úřadu?',
          areaLabel: 'Oblast služby',
          contextLabel: 'Další kontext',
          contextPlaceholder: 'Přidejte termíny, názvy úřadů nebo jazykové potřeby.',
          officialLabel: 'Zobrazit předání oficiálnímu zdroji, když je dostupné',
        },
      },
    },
  },
  uk: {
    translation: {
      meta: {
        title: 'Brama | Асистент міських послуг Любліна',
        description: 'Brama - це сучасна платформа AI-підтримки для міських послуг Любліна.',
      },
      navigation: {
        headerLabel: 'Навігація платформи Brama',
        homeLabel: 'Головна Brama',
        mainLabel: 'Основна навігація',
        languageLabel: 'Мова',
        platform: 'Платформа',
        services: 'Послуги',
        trust: 'Довіра',
        kit: 'UI набір',
      },
      hero: {
        eyebrow: 'AI-підтримка для міських послуг Любліна',
        title: 'Brama для послуг Любліна',
        lede: 'Сучасна вебплатформа, яка допомагає мешканцям зрозуміти публічні процедури, підготувати документи, знайти правильний шлях до установи й упевнено перейти від запитання до дії.',
        rotatorPrefix: 'Допомога з',
        rotatorLabel: 'Допомога з документами, візитами, виплатами та міськими повідомленнями',
        actionsLabel: 'Основні дії',
        primaryAction: 'Дослідити платформу',
        secondaryAction: 'Переглянути послуги',
        visualLabel: 'Попередній перегляд міської платформи, натхненної Любліном',
        imageAlt: 'Інтерфейс цифрового міського асистента, натхненний Любліном і оформлений сучасним мотивом брами',
      },
      assistantPreview: {
        label: 'Попередній перегляд асистента',
        question: 'Як поновити документ у Любліні?',
        answer: 'Вимоги, установи, форми та наступні кроки',
      },
      platform: {
        eyebrow: 'Мета платформи',
        title: 'Практична цифрова брама до міських процедур.',
        features: {
          guided: {
            title: 'Покроковий супровід справ',
            description:
              'Brama перетворює запитання про міські послуги на зрозумілі кроки, потрібні документи, контакти установ і наступні дії.',
          },
          local: {
            title: 'Відповіді з місцевим контекстом',
            description:
              'Платформа створена навколо потреб мешканців Любліна, міських процедур, багатомовності та надійних публічних джерел.',
          },
          handoff: {
            title: 'Готовність до передачі людині',
            description:
              'Коли справа потребує офіційного підтвердження, Brama спрямовує до відповідної установи, форми або каналу зв’язку.',
          },
        },
      },
      services: {
        eyebrow: 'Підтримка мешканців',
        title: 'Створено навколо щоденних міських запитань.',
        body: 'Brama зосереджується на типових ситуаціях у публічних послугах, коли мешканцям потрібна впевненість: документи, візити, терміни, право на підтримку, міська інформація та подальші дії, коли онлайн-відповіді недостатньо.',
        listLabel: 'Підтримувані напрями послуг',
        areas: {
          documents: 'Документи та довідки',
          appointments: 'Записи та візити до установ',
          benefits: 'Виплати та підтримка мешканців',
          transport: 'Транспорт і міські повідомлення',
        },
      },
      trust: {
        eyebrow: 'Модель довіри',
        title: 'Корисна за замовчуванням, обережна там, де важливий авторитет.',
        processLabel: 'Як Brama супроводжує мешканців',
        steps: {
          ask: 'Поставте запитання простою мовою',
          review: 'Перегляньте перевірені рекомендації',
          continue: 'Перейдіть до правильної міської дії',
        },
      },
      cta: {
        title: 'Створено для спокійнішого досвіду публічних послуг.',
        body: 'Brama поєднує візуальну мову Любліна з доступним продуктовим дизайном, щоб мешканці могли почати із запитання й отримати чіткий наступний крок.',
        action: 'Повернутися на початок',
      },
      kit: {
        eyebrow: 'UI набір',
        title: 'Спільні елементи інтерфейсу Brama.',
        body: 'Кнопки, поля, стилі тексту, бейджі та картки тепер використовують один шар компонентів на основі токенів для міських процесів і майбутніх екранів асистента.',
        cards: {
          actions: {
            badge: 'Дії',
            title: 'Кнопки',
            primary: 'Основна',
            secondary: 'Другорядна',
            quiet: 'Тиха',
          },
          text: {
            badge: 'Текст',
            title: 'Типографіка',
            body: 'Основний текст лишається читабельним, компактним і готовим до довших польських або українських назв послуг.',
            status: 'Перевірений наступний крок доступний',
          },
          status: {
            badge: 'Статус',
            title: 'Бейджі',
            draft: 'Чернетка',
            review: 'Перевірка',
            urgent: 'Терміново',
          },
        },
        form: {
          label: 'Приклади елементів форми',
          questionLabel: 'Запитання',
          questionDescription: 'Приклад поля запиту щодо послуги для мешканця.',
          questionPlaceholder: 'Як записатися на візит до установи?',
          areaLabel: 'Напрям послуги',
          contextLabel: 'Додатковий контекст',
          contextPlaceholder: 'Додайте терміни, назви установ або мовні потреби.',
          officialLabel: 'Показати перехід до офіційного джерела, коли він доступний',
        },
      },
    },
  },
} as const
