/* Dance Cart program catalogue.
   One place to edit programs, prices and checkout links. Every page reads from here:
   the catalogue, the cart, the program finder, enrolment and the admin preview. */
(function () {
  var KAJABI = 'https://dancecart.mykajabi.com/offers/';

  var programs = [
    {
      id: 'of-prep',
      family: 'online',
      name: 'Online Foundation',
      variant: 'Prep',
      band: ['prep'],
      bandLabel: 'Prep',
      mode: 'online',
      modeLabel: 'Online',
      price: 799,
      duration: '12 months access',
      art: 'candy',
      blurb: 'Ten on-screen lessons built for our youngest movers: listening games, rhythm and first dance steps.',
      includes: ['10 video lessons', '10 lesson plans', 'Assessment rubrics', 'Printable certificates', '30 min Zoom induction'],
      url: 'online-foundation.html',
      checkout: KAJABI + 'FQpwdJ78/checkout'
    },
    {
      id: 'of-y12',
      family: 'online',
      name: 'Online Foundation',
      variant: 'Year 1 to 2',
      band: ['y12'],
      bandLabel: 'Year 1–2',
      mode: 'online',
      modeLabel: 'Online',
      price: 799,
      duration: '12 months access',
      art: 'pink',
      blurb: 'Games, direct teaching and hip hop moves that build coordination, confidence and teamwork.',
      includes: ['10 video lessons', '10 lesson plans', 'Assessment rubrics', 'Student & teacher workbooks', '30 min Zoom induction'],
      url: 'online-foundation.html',
      checkout: KAJABI + '8AY7fSqw/checkout'
    },
    {
      id: 'of-y34',
      family: 'online',
      name: 'Online Foundation',
      variant: 'Year 3 to 4',
      band: ['y34'],
      bandLabel: 'Year 3–4',
      mode: 'online',
      modeLabel: 'Online',
      price: 799,
      duration: '12 months access',
      art: 'orange',
      blurb: 'Middle-primary choreography with music they actually love, plus band-specific assessment.',
      includes: ['10 video lessons', '10 lesson plans', 'Band-specific assessment', 'Curriculum links', '30 min Zoom induction'],
      url: 'online-foundation.html',
      checkout: KAJABI + 'xmFMhh3f/checkout'
    },
    {
      id: 'of-y56',
      family: 'online',
      name: 'Online Foundation',
      variant: 'Year 5 to 6',
      band: ['y56'],
      bandLabel: 'Year 5–6',
      mode: 'online',
      modeLabel: 'Online',
      price: 799,
      duration: '12 months access',
      art: 'sun',
      blurb: 'Upper-primary units where students choreograph, perform and reflect, ready for assessment.',
      includes: ['10 video lessons', '10 lesson plans', 'Assessment rubrics', 'Student & teacher workbooks', '30 min Zoom induction'],
      url: 'online-foundation.html',
      checkout: KAJABI + 'n8LpQJdf/checkout'
    },
    {
      id: 'of-all',
      family: 'online',
      name: 'Online Foundation',
      variant: 'Whole school',
      band: ['prep', 'y12', 'y34', 'y56'],
      bandLabel: 'Prep–Year 6',
      mode: 'online',
      modeLabel: 'Online',
      price: 1499,
      tag: 'Best value',
      duration: '12 months access',
      art: 'grad',
      blurb: 'Every unit, every band, one price. The simplest way to deliver dance across the whole school.',
      includes: ['All units, Prep to Year 6', 'Every lesson plan & rubric', 'Workbooks & certificates', 'Private Facebook group', 'Zoom induction for all teachers'],
      url: 'online-foundation.html',
      checkout: KAJABI + 'aFGz9tyS'
    },
    {
      id: 'in-school',
      family: 'inschool',
      name: 'In-School Term Program',
      variant: 'Our teachers, your hall',
      band: ['prep', 'y12', 'y34', 'y56'],
      bandLabel: 'Prep–Year 6',
      mode: 'inschool',
      modeLabel: 'In-school',
      price: null,
      tag: 'Most loved',
      duration: 'One school term',
      art: 'photo-rainbow',
      blurb: 'Dance Cart specialists teach weekly lessons at your school, ending in a performance for your community.',
      includes: ['Weekly lessons on site', 'Curriculum-aligned units', 'End-of-term performance', 'Music & choreography', 'Assessment support'],
      url: 'programs.html#in-school'
    },
    {
      id: 'fete',
      family: 'event',
      name: 'Fete & Concert Performance',
      variant: 'Showtime',
      band: ['prep', 'y12', 'y34', 'y56'],
      bandLabel: 'Any year level',
      mode: 'event',
      modeLabel: 'Event',
      price: null,
      duration: 'Rehearsals + show day',
      art: 'photo-jump',
      blurb: 'A show-stopping routine for your fete, concert or open day, rehearsed and performance-ready.',
      includes: ['Custom routine', 'Rehearsal sessions', 'Music edit', 'Costume ideas', 'Show-day support'],
      url: 'events.html'
    },
    {
      id: 'graduation',
      family: 'event',
      name: 'Graduation Dance',
      variant: 'Year 6 send-off',
      band: ['y56'],
      bandLabel: 'Year 6',
      mode: 'event',
      modeLabel: 'Event',
      price: null,
      duration: 'Rehearsals + graduation',
      art: 'photo-team',
      blurb: 'A graduation routine your Year 6s will remember long after the last bell.',
      includes: ['Graduation routine', 'Rehearsal sessions', 'Music edit', 'Entrance & finale staging', 'Graduation-night support'],
      url: 'events.html#graduation'
    },
    {
      id: 'free-resources',
      family: 'free',
      name: 'Classroom Resources',
      variant: 'Free for teachers',
      band: ['prep', 'y12', 'y34', 'y56'],
      bandLabel: 'All teachers',
      mode: 'free',
      modeLabel: 'Free',
      price: 0,
      duration: 'Sent to your inbox',
      art: 'ink',
      blurb: 'Join the Dance Cart community and get free dance resources to use in your classroom.',
      includes: ['Classroom dance activities', 'Teaching tips', 'New resources as they launch'],
      url: 'contact.html#resources'
    }
  ];

  var bands = [
    { id: 'all', label: 'All years' },
    { id: 'prep', label: 'Prep' },
    { id: 'y12', label: 'Year 1–2' },
    { id: 'y34', label: 'Year 3–4' },
    { id: 'y56', label: 'Year 5–6' }
  ];

  var modes = [
    { id: 'all', label: 'Every format' },
    { id: 'online', label: 'Online' },
    { id: 'inschool', label: 'In-school' },
    { id: 'event', label: 'Events' },
    { id: 'free', label: 'Free' }
  ];

  var testimonials = [
    { quote: 'Dance Cart has provided a wonderfully rich and engaging dance program at St John Vianney’s School, Manly for over 8 years.', more: 'The professional staff not only teach some wonderful dance skills to the students but fully prepare them for a high quality performance.', name: 'Geoff Sullivan', role: 'Principal', school: 'St John Vianney’s', logo: 'assets/img/school-sjv.png' },
    { quote: 'Dance Cart has been a great way to engage all our children and they improved in listening, motor skills and motivation for school.', name: 'Susan Crowe', role: 'Year 3C', school: 'Manly State School', logo: 'assets/img/school-manly.png' },
    { quote: 'I think you achieve an incredible professional product in only a few weeks and the students (and teachers!) love the process.', name: 'S Nightingale', role: 'Year 7', school: 'Guardian Angels' },
    { quote: 'The Dance Cart staff very quickly developed a positive rapport with the students. A fun and energetic program that got the best out of them every session.', name: 'Anita Maher', role: 'Year 4', school: 'St Pius', logo: 'assets/img/school-stpius.png' },
    { quote: 'We have been exceptionally happy with Dance Cart this year. The feedback from teachers has been excellent and we are fortunate to have found your company!', name: 'Allison', role: 'Teacher', school: 'Our Lady of the Way' },
    { quote: 'Loved the program again this year! The song choices and costumes were just fantastic.', name: 'Larissa Browne', role: 'Prep B', school: 'St Kevin’s', logo: 'assets/img/school-stkevins.png' }
  ];

  function byId(id) {
    for (var i = 0; i < programs.length; i++) if (programs[i].id === id) return programs[i];
    return null;
  }

  function money(n) {
    if (n === null || n === undefined) return 'Quote';
    if (n === 0) return 'Free';
    return '$' + n.toLocaleString('en-AU');
  }

  window.DC = {
    programs: programs,
    bands: bands,
    modes: modes,
    testimonials: testimonials,
    byId: byId,
    money: money,
    bundleId: 'of-all',
    bandIds: ['of-prep', 'of-y12', 'of-y34', 'of-y56']
  };
})();
