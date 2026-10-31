import type { PageContent } from "./types";

export const es: PageContent = {
  locale: "es",
  lang: "es",
  htmlLang: "es",
  meta: {
    title: "CR-CIPI | Cámara Costarricense de Inversión Privada Internacional",
    description:
      "Iniciativa independiente del sector privado que reúne profesionales y organizaciones para atraer, facilitar y proteger inversión privada internacional responsable en Costa Rica.",
  },
  nav: {
    home: "Inicio",
    about: "Quiénes Somos",
    join: "Únete",
    directory: "Directorio de Miembros",
    jobs: "Empleos",
    blog: "Artículos",
    privacy: "Privacidad",
    terms: "Términos",
    volunteer: "Voluntariado",
  },
  announcement: {
    enabled: true,
    eyebrow: "Transmisión en vivo",
    title: "CR-CIPI en vivo cada miércoles",
    body: "Acompáñenos los miércoles a las 3:30 p.m. para una transmisión en vivo sobre el avance de la Cámara y sus próximas actividades.",
    linkLabel: "Ver la transmisión en vivo",
    linkUrl: "",
  },
  home: {
    hero: {
      eyebrow: "Cámara Costarricense de Inversión Privada Internacional",
      headline: "Atrayendo inversión privada internacional responsable a Costa Rica.",
      body: "CR-CIPI reúne profesionales, empresas y organizaciones que atienden a residentes internacionales, inversionistas, pensionados, empresarios y familias que eligen Costa Rica para vivir, invertir y construir su futuro.",
      primaryCta: "Ser Voluntario Fundador",
      secondaryCta: "Únete a la Iniciativa",
    },
    stats: {
      items: [
        { value: "10", label: "Voluntarios Fundadores" },
        { value: "8", label: "Iniciativas Iniciales" },
        { value: "1", label: "Propósito Compartido" },
      ],
    },
    purpose: {
      eyebrow: "Nuestro propósito",
      heading: "Convertir a Costa Rica en uno de los destinos más atractivos, confiables y competitivos del mundo para la inversión privada internacional.",
      body: "Estamos construyendo un ecosistema profesional que genere valor para nuestros miembros, mejores recursos para nuestros clientes y beneficios económicos de largo plazo para Costa Rica.",
      vision: "Conectar Profesionales. Atraer Inversión. Crear Oportunidades. Fortalecer Costa Rica.",
    },
    whyJoin: {
      eyebrow: "¿Por qué formar parte de CR-CIPI?",
      heading: "Iniciativas diseñadas para generar valor desde el inicio",
      body: "Los miembros tendrán acceso a una creciente red de profesionales de alta reputación, oportunidades de negocio, marketing colaborativo, programas educativos y una voz colectiva sobre temas relacionados con la inversión privada internacional. A medida que la Cámara crezca, estas iniciativas también ayudarán a mejorar el posicionamiento internacional, el clima de inversión y las políticas públicas de Costa Rica.",
    },
    initiatives: {
      eyebrow: "Nuestras 8 iniciativas",
      heading: "Ocho iniciativas, un solo propósito",
      exampleLabel: "Ejemplo",
      memberValueLabel: "Valor para el miembro",
      items: [
        {
          title: "Red de Miembros de Alta Reputación",
          body: "CR-CIPI está creando una red confiable de profesionales y empresas comprometidos con altos estándares de servicio, transparencia y ética profesional. Entre nuestros miembros podrán participar abogados, profesionales migratorios, contadores, bancos, empresas inmobiliarias, desarrolladores, compañías de relocation, aseguradoras, proveedores de salud, asesores de inversión y otras organizaciones que atienden clientes internacionales.",
          example:
            "Un corredor de bienes raíces atendiendo a un comprador extranjero puede necesitar un abogado, banco, aseguradora o empresa de relocation confiable. CR-CIPI facilita estas conexiones.",
          memberValue: "Reputación, credibilidad, referencias y visibilidad profesional.",
        },
        {
          title: "Networking y Oportunidades de Negocio",
          body: "CR-CIPI creará espacios para desarrollar relaciones profesionales que puedan generar colaboración y nuevos negocios. Las actividades podrán incluir reuniones de miembros, desayunos empresariales, mesas redondas, videoconferencias, comités de trabajo, eventos sectoriales y presentaciones entre miembros.",
          example:
            "Una empresa de relocation puede conocer a un abogado migratorio, realtor y aseguradora dentro de CR-CIPI y desarrollar una red coordinada para futuros clientes.",
          memberValue: "Networking que produce oportunidades, no solo presentaciones.",
        },
        {
          title: "Marketing Colaborativo y Mercadeo Cruzado",
          body: "Trabajando juntos podemos tener una presencia internacional mucho mayor. CR-CIPI promoverá simultáneamente Costa Rica como destino, CR-CIPI como organización confiable y los servicios de nuestros miembros. Las campañas podrán incluir publicidad digital, redes sociales, videos educativos, entrevistas con miembros, webinars internacionales, relaciones con medios, artículos, eventos internacionales y directorio de miembros.",
          example:
            "En lugar de que cinco empresas promocionen Costa Rica individualmente en Florida, CR-CIPI puede organizar una sola campaña conjunta dirigida a potenciales inversionistas y retirados.",
          memberValue: "Mayor exposición, costos compartidos y mayor alcance internacional.",
        },
        {
          title: "Seminarios para Clientes",
          body: "Las personas que consideran mudarse o invertir en Costa Rica normalmente necesitan información de varios profesionales. CR-CIPI reunirá esos especialistas. Algunos seminarios podrán ser Cómo Vivir e Invertir en Costa Rica, Retirarse en Costa Rica, Comprar Propiedad en Costa Rica y Crear una Empresa en Costa Rica. Los seminarios podrán realizarse en línea, en Costa Rica o internacionalmente.",
          example:
            "Un solo seminario puede guiar a un cliente potencial a través de residencia, bienes raíces, impuestos, banca y relocation en un entorno confiable.",
          memberValue: "Una oportunidad de demostrar conocimiento directamente frente a clientes potenciales.",
        },
        {
          title: "Guías Prácticas para Clientes",
          body: "CR-CIPI desarrollará recursos educativos para ayudar a los clientes internacionales a entender Costa Rica antes de tomar decisiones importantes. Podrán incluir Invertir en Costa Rica, Retirarse en Costa Rica, Comprar Propiedad, Residencia e Inmigración, Banca e Impuestos, Crear una Empresa, Salud y Seguros y Mudarse a Costa Rica.",
          example:
            "Una persona considerando retirarse puede recibir una guía que explique residencia, banca, vivienda, seguros, salud, impuestos y relocation, y luego identificar miembros calificados de CR-CIPI para cada etapa.",
          memberValue: "Posicionar a los miembros como los expertos de confianza a los que los clientes acuden primero.",
        },
        {
          title: "Promoción Internacional de Costa Rica",
          body: "Costa Rica ha sido exitosa atrayendo turismo e inversión multinacional. Creemos que existe otra gran oportunidad: atraer directamente a personas y familias con capital privado. Esto incluye retirados, empresarios, inversionistas inmobiliarios, dueños de empresas, inversionistas independientes, familias internacionales y personas de alto patrimonio.",
          example:
            "CR-CIPI podría organizar un Seminario de Inversión y Retiro en Costa Rica en Florida, Texas o Canadá con varias empresas miembro bajo un solo mensaje unificado de Costa Rica.",
          memberValue: "Una presencia internacional coordinada que ninguna empresa podría construir por sí sola.",
        },
        {
          title: "Mejores Leyes y Políticas Públicas",
          body: "Promocionar Costa Rica no es suficiente. También debemos hacer que invertir sea más sencillo, seguro y competitivo. CR-CIPI identificará obstáculos y desarrollará recomendaciones concretas para instituciones públicas y legisladores. Una de nuestras primeras áreas de trabajo será el marco creado por la Ley 9996 para inversionistas, rentistas y pensionados.",
          example:
            "El trabajo podrá incluir simplificación de residencia, reducción de atrasos administrativos, mayor seguridad jurídica y protección al inversionista, e inversión fuera del GAM.",
          memberValue: "Una voz colectiva sobre los temas que definen el clima de inversión.",
        },
        {
          title: "Medir el Impacto Económico",
          body: "Costa Rica cuenta con amplia información sobre inversión multinacional, pero sabemos mucho menos sobre el impacto económico acumulado de las personas y familias internacionales que viven e invierten aquí. CR-CIPI quiere ayudar a medirlo. Queremos consolidar información sobre bienes raíces, construcción, empresas, empleo, servicios profesionales, salud, seguros, transporte, turismo, consumo, impuestos e inversión regional.",
          example:
            "Una familia internacional puede comprar una propiedad, contratar profesionales, comprar seguros, utilizar salud privada, contratar empleados, consumir localmente y continuar invirtiendo durante décadas.",
          memberValue: "Datos confiables que demuestran el valor de este sector y respaldan futuras políticas.",
        },
      ],
    },
    sharedPurpose: {
      eyebrow: "Un solo propósito",
      heading: "Costa Rica debe competir por personas, familias y capital privado",
      body: [
        "Costa Rica lleva décadas compitiendo exitosamente por inversión multinacional. Creemos que también debemos competir por otra valiosa forma de inversión internacional: personas, familias, empresarios, retirados, inversionistas y capital privado.",
        "Cuando una familia internacional escoge Costa Rica, hace mucho más que comprar una propiedad. Contrata profesionales, apoya empresas, genera empleo, consume localmente, invierte, paga impuestos y se integra a comunidades. Muchas continúan contribuyendo a Costa Rica durante décadas.",
        "CR-CIPI existe para construir la red profesional, promoción internacional, información y políticas necesarias para atraer más de esta inversión.",
      ],
      cta: "Únete a la Iniciativa",
    },
  },
  about: {
    hero: {
      eyebrow: "Quiénes Somos",
      heading: "Una iniciativa independiente del sector privado",
      body: [
        "CR-CIPI es una iniciativa independiente del sector privado creada para reunir profesionales y organizaciones que creemos que Costa Rica puede convertirse en uno de los principales destinos del mundo para la inversión privada internacional responsable.",
        "A diferencia de organizaciones enfocadas principalmente en multinacionales, CR-CIPI pone atención en la inversión generada por personas y familias que escogen Costa Rica para vivir, retirarse, adquirir propiedades, crear empresas e invertir su capital privado.",
        "Nuestro objetivo es construir un ecosistema profesional organizado capaz de colaborar con instituciones públicas, legisladores, municipalidades, cámaras empresariales, universidades y comunidades internacionales.",
      ],
    },
    mission: {
      eyebrow: "Nuestra misión",
      heading: "Misión",
      body: "Atraer, facilitar y proteger inversión privada internacional responsable, generando al mismo tiempo valor económico de largo plazo para Costa Rica.",
    },
    priorities: {
      eyebrow: "Prioridades institucionales",
      heading: "Cinco prioridades institucionales",
      items: [
        {
          title: "Investigación y Datos",
          description:
            "Medir y comunicar el impacto económico de los residentes internacionales y los inversionistas privados.",
        },
        {
          title: "Política Pública",
          description: "Desarrollar propuestas de política pública y legislación basadas en evidencia.",
        },
        {
          title: "Atracción de Inversión",
          description: "Promover Costa Rica en los mercados internacionales relevantes.",
        },
        {
          title: "Estándares Profesionales",
          description:
            "Promover transparencia, ética y prácticas responsables en todo el ecosistema.",
        },
        {
          title: "Colaboración",
          description:
            "Construir puentes entre el sector privado, el gobierno, la academia y las comunidades internacionales.",
        },
      ],
    },
    not: {
      eyebrow: "Lo que no somos",
      heading: "Lo que CR-CIPI no es",
      items: [
        "No es una empresa ni correduría de bienes raíces.",
        "No es un fondo de inversión ni un asesor financiero.",
        "No es un bufete de abogados de inmigración.",
        "No es una empresa de reubicación.",
        "No es una agencia gubernamental.",
        "No es una plataforma creada para promover los intereses comerciales de un solo miembro.",
      ],
      positioning:
        "CR-CIPI es una iniciativa de cámara colaborativa enfocada en fortalecer el ecosistema de inversión privada internacional de Costa Rica.",
    },
  },
  join: {
    hero: {
      eyebrow: "Únete a CR-CIPI",
      heading: "Ayúdenos a Construir CR-CIPI",
      body: "CR-CIPI se encuentra actualmente en desarrollo con el apoyo de voluntarios. Buscamos profesionales que crean que Costa Rica puede atraer significativamente más inversión privada internacional responsable y que deseen aportar su conocimiento, experiencia y tiempo.",
    },
    committees: {
      eyebrow: "Comités fundacionales",
      heading: "Cinco comités de trabajo fundacionales",
      items: [
        { name: "Comité de Política Pública y Legislación" },
        { name: "Comité de Atracción de Inversión" },
        { name: "Comité de Investigación e Impacto Económico" },
        { name: "Comité de Membresía y Alianzas" },
        { name: "Comité de Comunicación y Promoción Internacional" },
      ],
    },
    participation: {
      eyebrow: "Formas de participar",
      heading: "Cómo puede involucrarse",
      options: [
        {
          title: "Voluntario",
          purpose: "Aportar experiencia profesional y tiempo.",
        },
        {
          title: "Miembro de Comité",
          purpose: "Participar activamente en uno de los comités de trabajo fundacionales.",
        },
        {
          title: "Miembro Fundador",
          purpose: "Ayudar a definir la gobernanza, las prioridades y la agenda inicial.",
        },
        {
          title: "Aliado Corporativo",
          purpose: "Apoyar investigación, eventos, operaciones o promoción internacional.",
        },
        {
          title: "Aliado Gubernamental / Institucional",
          purpose: "Colaborar en política, investigación y desarrollo del ecosistema.",
        },
        {
          title: "Aliado Académico / de Investigación",
          purpose: "Apoyar datos, medición, estudios y propuestas basadas en evidencia.",
        },
      ],
    },
    goals: {
      eyebrow: "Metas fundacionales",
      heading: "Nuestras metas fundacionales a 12 meses",
      items: [
        { metric: "Profesionales", target: "100" },
        { metric: "Organizaciones fundadoras", target: "25" },
        { metric: "Comités de trabajo", target: "5" },
        { metric: "Estudio de impacto económico", target: "1" },
        { metric: "Propuestas de política pública", target: "3" },
      ],
    },
    form: {
      heading: "Formulario de Voluntariado / Interés",
      intro:
        "Cuéntenos sobre usted y cómo le gustaría contribuir. Nos pondremos en contacto sobre los próximos pasos.",
      fields: {
        firstName: "Nombre",
        lastName: "Apellidos",
        company: "Empresa / Organización",
        profession: "Profesión / Cargo",
        email: "Correo electrónico",
        phone: "Teléfono / WhatsApp",
        linkedin: "URL de LinkedIn",
        expertise: "Área de Especialidad",
        participation: "¿Cómo le gustaría participar?",
        reason: "¿Por qué le interesa apoyar a CR-CIPI?",
        language: "Idioma Preferido",
        consent: "Acepto ser contactado(a) sobre CR-CIPI.",
        submit: "Enviar",
        submitting: "Enviando...",
      },
      expertiseOptions: [
        { value: "law", label: "Derecho" },
        { value: "immigration", label: "Inmigración" },
        { value: "public-policy", label: "Política Pública" },
        { value: "government-relations", label: "Relaciones Gubernamentales" },
        { value: "real-estate", label: "Bienes Raíces" },
        { value: "banking", label: "Banca" },
        { value: "investments", label: "Inversiones" },
        { value: "accounting", label: "Contabilidad" },
        { value: "tax", label: "Impuestos" },
        { value: "economics", label: "Economía" },
        { value: "international-trade", label: "Comercio Internacional" },
        { value: "development", label: "Desarrollo" },
        { value: "tourism", label: "Turismo" },
        { value: "relocation", label: "Reubicación" },
        { value: "marketing", label: "Marketing" },
        { value: "communications", label: "Comunicaciones" },
        { value: "research", label: "Investigación" },
        { value: "academia", label: "Academia" },
        { value: "international-relations", label: "Relaciones Internacionales" },
        { value: "other", label: "Otro" },
      ],
      participationOptions: [
        { value: "volunteer", label: "Voluntario" },
        { value: "committee-member", label: "Miembro de Comité" },
        { value: "founding-member", label: "Miembro Fundador" },
        { value: "corporate-partner", label: "Aliado Corporativo" },
        { value: "government-institutional", label: "Aliado Gubernamental / Institucional" },
        { value: "academic-research", label: "Aliado Académico / de Investigación" },
        { value: "other", label: "Otro" },
      ],
      languageOptions: [
        { value: "en", label: "Inglés" },
        { value: "es", label: "Español" },
      ],
      errors: {
        required: "Este campo es obligatorio.",
        email: "Por favor ingrese un correo electrónico válido.",
        consent: "Por favor acepte ser contactado(a) para enviar el formulario.",
        generic: "Algo salió mal. Por favor intente de nuevo.",
      },
      success: {
        title: "Gracias por su interés",
        body: "Hemos recibido su solicitud. Nos pondremos en contacto sobre los próximos pasos.",
      },
    },
  },
  directory: {
    meta: {
      title: "Directorio de Miembros | CR-CIPI",
      description:
        "Encuentre proveedores miembros de CR-CIPI de confianza que atienden a residentes, inversionistas y familias internacionales en Costa Rica.",
    },
    hero: {
      eyebrow: "Directorio de miembros",
      heading: "Proveedores miembros de confianza",
      body: "Un directorio de profesionales y empresas miembros de CR-CIPI comprometidos con altos estándares de servicio, transparencia y práctica responsable.",
    },
    filters: {
      browse: "Explorar proveedores",
      all: "Todos",
      search: "Buscar",
      searchPlaceholder: "Buscar por nombre o categoría",
      noResults: "Ningún proveedor coincide con su búsqueda.",
      verifiedOnly: "Solo verificados",
    },
    card: {
      featured: "Destacado",
      verified: "Verificado",
      verifiedHint: "CR-CIPI revisó el registro legal y las licencias de esta empresa.",
      reviews: "reseñas",
      noReviews: "Sin reseñas todavía",
      visit: "Visitar",
    },
    rating: {
      heading: "Dejar una reseña",
      intro: "Su opinión ayuda a otros a elegir proveedores de confianza.",
      ratingLabel: "Calificación",
      nameLabel: "Su nombre",
      emailLabel: "Correo electrónico",
      emailNote: "Su correo está oculto al público y solo lo ve la empresa.",
      commentLabel: "Comentario (opcional)",
      sendCode: "Continuar",
      codeLabel: "Código de verificación",
      codeSent: "Enviamos un código de 6 dígitos a su correo. Introdúzcalo abajo.",
      codePlaceholder: "000000",
      verify: "Verificar",
      alreadyTitle: "Ya reseñó esta empresa",
      alreadyIntro: "Esta es su reseña actual. Puede cambiarla abajo.",
      changeReview: "Actualizar reseña",
      newsletterPrompt: "¿Quiere mantenerse al día?",
      newsletterYes: "Sí",
      submit: "Enviar reseña",
      submitting: "Enviando...",
      success: "Gracias. Su reseña fue enviada.",
      pending: "La puntuación se actualiza al guardar su reseña.",
      errors: {
        rating: "Seleccione una calificación de 1 a 5.",
        name: "Ingrese su nombre.",
        email: "Ingrese un correo válido.",
        code: "Ingrese el código de 6 dígitos.",
        generic: "Algo salió mal. Inténtelo de nuevo.",
      },
    },
  },
  jobs: {
    meta: {
      title: "Empleos en empresas miembro de CR-CIPI | CR-CIPI",
      description:
        "Puestos abiertos en firmas miembro que atienden a residentes e inversionistas internacionales en Costa Rica.",
    },
    hero: {
      eyebrow: "Bolsa de empleo",
      heading: "Trabaje con las firmas que atienden la inversión internacional",
      body: ["Puestos publicados directamente por empresas miembro de CR-CIPI. Aplique en un paso; su solicitud llega directo al empleador."],
    },
    board: {
      search: "Buscar empleos",
      searchPlaceholder: "Puesto, empresa o ubicación",
      allTypes: "Todos los tipos",
      allModes: "Cualquier modalidad",
      empty: "No hay puestos que coincidan. Vuelva pronto.",
      posted: "Publicado",
      view: "Ver puesto",
      postHeading: "¿Está contratando?",
      postBody: "Las empresas miembro publican vacantes gratis desde su panel.",
      postCta: "Publicar un empleo",
    },
    detail: {
      back: "Todos los empleos",
      about: "Sobre el puesto",
      requirements: "Requisitos",
      salary: "Salario",
      location: "Ubicación",
      type: "Tipo",
      mode: "Modalidad",
      company: "Empresa",
      verified: "Proveedor verificado",
      expires: "Abierto hasta",
    },
    apply: {
      heading: "Aplicar",
      intro: "Su solicitud se envía al empleador. CR-CIPI no la vende ni la comparte con nadie más.",
      name: "Nombre completo",
      email: "Correo electrónico",
      phone: "Teléfono (opcional)",
      linkedin: "LinkedIn (opcional)",
      message: "Por qué es la persona indicada",
      messageHint: "Unas frases sobre su experiencia. Mínimo 20 caracteres.",
      cv: "Currículum (opcional)",
      cvHint: "PDF, JPG o PNG. Máximo 5 MB.",
      consent: "Acepto que CR-CIPI comparta mi solicitud con este empleador, según la política de privacidad.",
      submit: "Enviar solicitud",
      submitting: "Enviando…",
      success: "Solicitud enviada. El empleador le contactará directamente. Le enviamos una confirmación por correo.",
      errorRequired: "Complete los campos obligatorios.",
      errorMessage: "Cuéntele un poco más al empleador (mínimo 20 caracteres).",
      errorEmail: "Ingrese un correo válido.",
      errorCv: "No podemos usar ese archivo. Suba un PDF, JPG o PNG de menos de 5 MB.",
      errorRateLimited: "Demasiadas solicitudes desde esta conexión. Intente más tarde.",
      errorGeneric: "Algo salió mal. Intente de nuevo.",
    },
  },
  blog: {
    meta: {
      title: "Artículos de miembros de CR-CIPI | CR-CIPI",
      description:
        "Artículos prácticos de profesionales que ayudan a personas y familias internacionales a vivir, invertir y hacer negocios en Costa Rica.",
    },
    hero: {
      eyebrow: "Conocimiento de miembros",
      heading: "Conocimiento práctico para invertir en Costa Rica",
      body: ["Artículos escritos por profesionales miembros de CR-CIPI. Cada artículo se revisa por relevancia y neutralidad antes de publicarse."],
    },
    list: {
      all: "Todos",
      empty: "Aún no hay artículos.",
      readMore: "Leer artículo",
      by: "Por",
      minutes: "min de lectura",
      writeHeading: "¿Es miembro?",
      writeBody: "Comparta su conocimiento con la comunidad internacional. Los artículos se revisan en minutos.",
      writeCta: "Escribir un artículo",
    },
    article: {
      back: "Todos los artículos",
      by: "Por",
      published: "Publicado",
      disclaimer:
        "Este artículo refleja la opinión de su autor y es solo informativo. No constituye asesoría legal, tributaria ni de inversión.",
      related: "Más artículos",
    },
  },
  privacy: {
    meta: {
      title: "Política de Privacidad | CR-CIPI",
      description: "Cómo CR-CIPI recopila, usa y protege datos personales conforme a la Ley 8968 de Costa Rica.",
    },
    eyebrow: "Legal",
    heading: "Política de Privacidad",
    updated: "Última actualización: 31 de octubre de 2026",
    intro:
      "CR-CIPI respeta su privacidad. Esta política explica qué datos personales recopilamos, para qué, y los derechos que le otorga la Ley N.° 8968 de Protección de la Persona frente al Tratamiento de sus Datos Personales y su reglamento.",
    sections: [
      {
        heading: "1. Responsable",
        paragraphs: [
          "La iniciativa CR-CIPI (Cámara Costarricense de Inversión Privada Internacional) es responsable de la base de datos aquí descrita. Contacto: info@crcipi.org.",
        ],
      },
      {
        heading: "2. Datos que recopilamos",
        paragraphs: [
          "Formulario de voluntariado y membresía: nombre, correo, teléfono, empresa, profesión, LinkedIn, áreas de experiencia y los motivos que comparte.",
          "Cuentas de miembro: correo, nombre y las fichas de empresa que publica.",
          "Verificación de empresas: razón social, cédula, representante legal, año de fundación, número de colaboradores, licencias y los documentos que adjunta.",
          "Solicitudes de empleo: nombre, correo, teléfono, LinkedIn, mensaje y currículum, que se envían al empleador al que aplica.",
          "Reseñas y artículos: su nombre, correo verificado y el contenido que envía.",
          "Datos técnicos: dirección IP para control de abuso y seguridad, y conteos agregados de visitas. No usamos cookies publicitarias.",
        ],
      },
      {
        heading: "3. Para qué los usamos",
        paragraphs: [
          "Para operar la iniciativa y sus comités, administrar cuentas de miembros, verificar empresas antes de mostrar la insignia de Verificado, entregar solicitudes de empleo a los empleadores, moderar el contenido público, enviar los correos que usted solicita y proteger la plataforma.",
          "Los artículos se revisan con un sistema automatizado de inteligencia artificial por relevancia y neutralidad. Un editor humano revisa todo artículo que el sistema rechace o no pueda decidir.",
        ],
      },
      {
        heading: "4. Quién los recibe",
        paragraphs: [
          "Los empleadores reciben las solicitudes que usted les envía. Los documentos de verificación solo los ven revisores autorizados de CR-CIPI. Usamos proveedores para alojar datos (Google Firebase), enviar correos y ejecutar la revisión automática; tratan los datos solo bajo nuestras instrucciones. Nunca vendemos datos personales.",
        ],
      },
      {
        heading: "5. Por cuánto tiempo",
        paragraphs: [
          "Conservamos los datos mientras su cuenta o ficha esté activa y el tiempo necesario para cumplir obligaciones legales. Puede eliminar sus empresas y empleos desde su panel en cualquier momento.",
        ],
      },
      {
        heading: "6. Sus derechos",
        paragraphs: [
          "Puede acceder, rectificar, actualizar o suprimir sus datos y revocar su consentimiento en cualquier momento escribiendo a info@crcipi.org. Si no está satisfecho con nuestra respuesta, puede acudir a la Agencia de Protección de Datos de los Habitantes (PRODHAB).",
        ],
      },
      {
        heading: "7. Seguridad",
        paragraphs: [
          "Los códigos de acceso se guardan cifrados con hash, los documentos se almacenan de forma privada y solo se abren mediante enlaces que vencen en minutos, y el acceso administrativo está limitado por permisos.",
        ],
      },
    ],
  },
  terms: {
    meta: {
      title: "Términos de Uso | CR-CIPI",
      description: "Reglas de uso del sitio de CR-CIPI, el directorio de miembros, la bolsa de empleo y los artículos.",
    },
    eyebrow: "Legal",
    heading: "Términos de Uso",
    updated: "Última actualización: 31 de octubre de 2026",
    intro: "Al usar crcipi.org usted acepta estos términos. Si no está de acuerdo, por favor no use el sitio.",
    sections: [
      {
        heading: "1. Qué es CR-CIPI",
        paragraphs: [
          "CR-CIPI es una iniciativa independiente del sector privado en formación. No brinda asesoría legal, tributaria, migratoria ni de inversión, y no vende productos de inversión.",
        ],
      },
      {
        heading: "2. Fichas de miembros e insignia de Verificado",
        paragraphs: [
          "Los miembros son responsables de la exactitud de sus fichas. La insignia de Verificado significa que CR-CIPI revisó los documentos aportados por el miembro en ese momento; no es una garantía, aval ni certificación de la calidad de sus servicios. Siempre haga su propia debida diligencia.",
        ],
      },
      {
        heading: "3. Bolsa de empleo",
        paragraphs: [
          "Los empleos los publican las empresas miembro, que son las únicas responsables de ellos y de sus decisiones de contratación. Las publicaciones deben describir puestos reales, cumplir la legislación laboral costarricense y no discriminar. Nunca pague por aplicar a un empleo.",
        ],
      },
      {
        heading: "4. Artículos y reseñas",
        paragraphs: [
          "Los miembros conservan la titularidad de sus artículos y otorgan a CR-CIPI una licencia gratuita para publicarlos y compartirlos. El contenido debe ser relevante para la comunidad y no puede ser político, religioso, difamatorio, discriminatorio, engañoso ni puramente publicitario. CR-CIPI puede rechazar, ajustar el formato o retirar contenido a su criterio.",
        ],
      },
      {
        heading: "5. Cuentas",
        paragraphs: [
          "Mantenga seguro el acceso a su correo: quien pueda leerlo puede ingresar con un código de un solo uso. Podemos suspender cuentas que incumplan estos términos.",
        ],
      },
      {
        heading: "6. Responsabilidad y ley aplicable",
        paragraphs: [
          "El sitio se ofrece tal cual. En la medida que lo permita la ley, CR-CIPI no es responsable de las relaciones entre usuarios, miembros y empleadores. Estos términos se rigen por las leyes de la República de Costa Rica.",
        ],
      },
    ],
  },
  footer: {
    purpose:
      "Una iniciativa independiente del sector privado para atraer, facilitar y proteger inversión privada internacional responsable en Costa Rica.",
    contact: "Contacto",
    linkedin: "LinkedIn",
    formation:
      "CR-CIPI es actualmente una iniciativa en desarrollo. Su estructura organizativa, gobernanza y constitución formal están siendo definidas por sus participantes fundadores.",
    rights: "Todos los derechos reservados.",
  },
};