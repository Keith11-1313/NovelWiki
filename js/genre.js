// controls which sidebar modules show up based on the novel's genre
// also maps genre types to their accent colors

const Genre = {

  // accent color for each genre type (mirrors the css variables)
  accent: {
    cultivation:  '#f0a500',
    tower:        '#58a6ff',
    regression:   '#f78166',
    system:       '#3fb950',
    isekai:       '#bc8cff',
    fantasy:      '#db61a2',
    'sci-fi':     '#39d0d8',
    'light-novel':'#8b949e',
    'web-novel':  '#8b949e',
    other:        '#f0a500'
  },

  // full list of all possible sidebar modules
  // genre-specific ones have a genre field that limits when they appear
  allModules: [
    { id: 'overview',    label: 'Overview',           icon: 'bi-book',                  section: 'novel'    },
    { id: 'characters',  label: 'Characters',          icon: 'bi-people',                section: 'world'    },
    { id: 'power',       label: 'Power System',        icon: 'bi-bar-chart-steps',       section: 'world'    },
    { id: 'techniques',  label: 'Techniques & Skills', icon: 'bi-lightning',             section: 'world'    },
    { id: 'artifacts',   label: 'Artifacts & Items',   icon: 'bi-gem',                   section: 'world'    },
    { id: 'pills',       label: 'Pills & Resources',   icon: 'bi-capsule',               section: 'world'    },
    { id: 'bloodlines',  label: 'Bloodlines',          icon: 'bi-dna',                   section: 'world'    },
    { id: 'bestiary',    label: 'Bestiary',            icon: 'bi-bug',                   section: 'world'    },
    { id: 'locations',   label: 'Locations',           icon: 'bi-map',                   section: 'world'    },
    { id: 'realms',      label: 'Realms & Dimensions', icon: 'bi-globe2',                section: 'world'    },
    { id: 'factions',    label: 'Factions',            icon: 'bi-shield',                section: 'world'    },
    { id: 'events',      label: 'Battles & Events',    icon: 'bi-crosshair',             section: 'story'    },
    { id: 'arcs',        label: 'Story Arcs',          icon: 'bi-diagram-3',             section: 'story'    },
    { id: 'lore',        label: 'Lore & Prophecies',   icon: 'bi-journal-text',          section: 'story'    },
    { id: 'glossary',    label: 'Glossary',            icon: 'bi-alphabet',              section: 'story'    },
    { id: 'analysis',    label: 'AI Analysis',         icon: 'bi-cpu',                   section: 'analysis' },
    // genre-exclusive modules
    { id: 'floors',      label: 'Floor Records',       icon: 'bi-layers',                section: 'genre', genre: 'tower'      },
    { id: 'loops',       label: 'Regression Loops',    icon: 'bi-arrow-counterclockwise', section: 'genre', genre: 'regression' },
    { id: 'status',      label: 'Status Windows',      icon: 'bi-hdd-stack',             section: 'genre', genre: ['system','isekai'] },
  ],

  // renames the "Power System" label depending on the novel type
  // tower novels call it floor system, system novels call it level & stats, etc.
  powerLabel(type) {
    const map = {
      tower:      'Floor System',
      regression: 'Regression Loops',
      system:     'Level & Stats',
      isekai:     'Level & Stats',
      'sci-fi':   'Tech Ranks'
    };
    return map[type] || 'Power System';
  },

  // filters the module list to only include ones that match the current genre
  getModules(type) {
    return this.allModules.filter(m => {
      if (!m.genre) return true;
      if (Array.isArray(m.genre)) return m.genre.includes(type);
      return m.genre === type;
    });
  },

  // applies the genre type to the body so css can pick up the right accent color
  applyAccent(type) {
    document.body.dataset.genre = type || 'other';
  }
};
