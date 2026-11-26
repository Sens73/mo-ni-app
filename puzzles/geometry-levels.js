// Own geometry puzzles, seed 2026100717.
export const mazeLevels = [
  {
    "rows": 3,
    "cols": 3,
    "blocked": [],
    "turns": {
      "0": "L"
    },
    "start": 4,
    "end": 6,
    "id": "maze-1",
    "band": "Entdecker",
    "reward": 10,
    "solution": [
      4,
      7,
      8,
      5,
      2,
      1,
      0,
      3,
      6
    ],
    "metrics": {
      "free": 9,
      "letters": 1,
      "nodes": 31,
      "choices": 5,
      "solutions": 1
    }
  },
  {
    "rows": 3,
    "cols": 3,
    "blocked": [
      0
    ],
    "turns": {},
    "start": 1,
    "end": 2,
    "id": "maze-2",
    "band": "Entdecker",
    "reward": 10,
    "solution": [
      1,
      4,
      3,
      6,
      7,
      8,
      5,
      2
    ],
    "metrics": {
      "free": 8,
      "letters": 0,
      "nodes": 21,
      "choices": 4,
      "solutions": 1
    }
  },
  {
    "rows": 4,
    "cols": 4,
    "blocked": [],
    "turns": {
      "2": "R"
    },
    "start": 6,
    "end": 15,
    "id": "maze-3",
    "band": "Tüftler",
    "reward": 15,
    "solution": [
      6,
      2,
      3,
      7,
      11,
      10,
      9,
      5,
      1,
      0,
      4,
      8,
      12,
      13,
      14,
      15
    ],
    "metrics": {
      "free": 16,
      "letters": 1,
      "nodes": 441,
      "choices": 125,
      "solutions": 1
    }
  },
  {
    "rows": 4,
    "cols": 4,
    "blocked": [
      0,
      3
    ],
    "turns": {},
    "start": 6,
    "end": 2,
    "id": "maze-4",
    "band": "Tüftler",
    "reward": 15,
    "solution": [
      6,
      7,
      11,
      15,
      14,
      10,
      9,
      13,
      12,
      8,
      4,
      5,
      1,
      2
    ],
    "metrics": {
      "free": 14,
      "letters": 0,
      "nodes": 307,
      "choices": 77,
      "solutions": 1
    }
  },
  {
    "rows": 5,
    "cols": 5,
    "blocked": [],
    "turns": {
      "3": "R",
      "7": "L",
      "12": "R",
      "13": "R"
    },
    "start": 10,
    "end": 4,
    "id": "maze-5",
    "band": "Knobelmeister",
    "reward": 25,
    "solution": [
      10,
      5,
      0,
      1,
      2,
      3,
      8,
      13,
      12,
      7,
      6,
      11,
      16,
      15,
      20,
      21,
      22,
      17,
      18,
      23,
      24,
      19,
      14,
      9,
      4
    ],
    "metrics": {
      "free": 25,
      "letters": 4,
      "nodes": 6735,
      "choices": 1667,
      "solutions": 1
    }
  },
  {
    "rows": 5,
    "cols": 5,
    "blocked": [
      0
    ],
    "turns": {
      "12": "R",
      "18": "L",
      "22": "R"
    },
    "start": 16,
    "end": 11,
    "id": "maze-6",
    "band": "Knobelmeister",
    "reward": 25,
    "solution": [
      16,
      21,
      20,
      15,
      10,
      5,
      6,
      1,
      2,
      3,
      4,
      9,
      14,
      19,
      24,
      23,
      22,
      17,
      18,
      13,
      8,
      7,
      12,
      11
    ],
    "metrics": {
      "free": 24,
      "letters": 3,
      "nodes": 2087,
      "choices": 481,
      "solutions": 1
    }
  }
];
export const polyLevels = [
  {
    "rows": 2,
    "cols": 3,
    "blocked": [],
    "pieces": [
      {
        "label": "A",
        "cells": [
          [
            1,
            1
          ],
          [
            0,
            1
          ],
          [
            1,
            0
          ]
        ]
      },
      {
        "label": "B",
        "cells": [
          [
            0,
            0
          ],
          [
            0,
            1
          ],
          [
            1,
            0
          ]
        ]
      }
    ],
    "id": "poly-1",
    "band": "Entdecker",
    "reward": 10,
    "solution": [
      {
        "anchor": 0,
        "turn": 1,
        "flip": false
      },
      {
        "anchor": 1,
        "turn": 1,
        "flip": false
      }
    ],
    "metrics": {
      "pieces": 2,
      "nodes": 5,
      "choices": 1,
      "solutionsAtLeast": 2,
      "placements": [
        8,
        8
      ]
    }
  },
  {
    "rows": 3,
    "cols": 3,
    "blocked": [
      4
    ],
    "pieces": [
      {
        "label": "A",
        "cells": [
          [
            0,
            0
          ],
          [
            1,
            0
          ],
          [
            0,
            1
          ],
          [
            0,
            2
          ]
        ]
      },
      {
        "label": "B",
        "cells": [
          [
            1,
            0
          ],
          [
            1,
            1
          ],
          [
            1,
            2
          ],
          [
            0,
            2
          ]
        ]
      }
    ],
    "id": "poly-2",
    "band": "Entdecker",
    "reward": 10,
    "solution": [
      {
        "anchor": 0,
        "turn": 0,
        "flip": false
      },
      {
        "anchor": 2,
        "turn": 0,
        "flip": false
      }
    ],
    "metrics": {
      "pieces": 2,
      "nodes": 5,
      "choices": 1,
      "solutionsAtLeast": 2,
      "placements": [
        8,
        8
      ]
    }
  },
  {
    "rows": 3,
    "cols": 4,
    "blocked": [],
    "pieces": [
      {
        "label": "A",
        "cells": [
          [
            1,
            1
          ],
          [
            2,
            1
          ],
          [
            0,
            1
          ],
          [
            0,
            0
          ]
        ]
      },
      {
        "label": "B",
        "cells": [
          [
            2,
            0
          ],
          [
            2,
            1
          ],
          [
            1,
            0
          ],
          [
            0,
            0
          ]
        ]
      },
      {
        "label": "C",
        "cells": [
          [
            2,
            0
          ],
          [
            1,
            0
          ],
          [
            3,
            0
          ],
          [
            0,
            0
          ]
        ]
      }
    ],
    "id": "poly-3",
    "band": "Tüftler",
    "reward": 15,
    "solution": [
      {
        "anchor": 0,
        "turn": 0,
        "flip": false
      },
      {
        "anchor": 1,
        "turn": 0,
        "flip": false
      },
      {
        "anchor": 8,
        "turn": 0,
        "flip": false
      }
    ],
    "metrics": {
      "pieces": 3,
      "nodes": 20,
      "choices": 4,
      "solutionsAtLeast": 2,
      "placements": [
        28,
        28,
        3
      ]
    }
  },
  {
    "rows": 3,
    "cols": 4,
    "blocked": [],
    "pieces": [
      {
        "label": "A",
        "cells": [
          [
            0,
            1
          ],
          [
            0,
            0
          ],
          [
            0,
            2
          ],
          [
            1,
            1
          ]
        ]
      },
      {
        "label": "B",
        "cells": [
          [
            0,
            1
          ],
          [
            1,
            1
          ],
          [
            2,
            1
          ],
          [
            1,
            0
          ]
        ]
      },
      {
        "label": "C",
        "cells": [
          [
            2,
            0
          ],
          [
            2,
            1
          ],
          [
            1,
            0
          ],
          [
            0,
            0
          ]
        ]
      }
    ],
    "id": "poly-4",
    "band": "Tüftler",
    "reward": 15,
    "solution": [
      {
        "anchor": 0,
        "turn": 0,
        "flip": false
      },
      {
        "anchor": 1,
        "turn": 2,
        "flip": false
      },
      {
        "anchor": 7,
        "turn": 2,
        "flip": true
      }
    ],
    "metrics": {
      "pieces": 3,
      "nodes": 6,
      "choices": 2,
      "solutionsAtLeast": 2,
      "placements": [
        14,
        14,
        28
      ]
    }
  },
  {
    "rows": 4,
    "cols": 4,
    "blocked": [],
    "pieces": [
      {
        "label": "A",
        "cells": [
          [
            1,
            1
          ],
          [
            1,
            0
          ],
          [
            1,
            2
          ],
          [
            0,
            2
          ]
        ]
      },
      {
        "label": "B",
        "cells": [
          [
            1,
            0
          ],
          [
            1,
            1
          ],
          [
            0,
            0
          ],
          [
            0,
            1
          ]
        ]
      },
      {
        "label": "C",
        "cells": [
          [
            0,
            0
          ],
          [
            0,
            1
          ],
          [
            1,
            1
          ],
          [
            2,
            1
          ]
        ]
      },
      {
        "label": "D",
        "cells": [
          [
            0,
            3
          ],
          [
            0,
            2
          ],
          [
            0,
            1
          ],
          [
            0,
            0
          ]
        ]
      }
    ],
    "id": "poly-5",
    "band": "Knobelmeister",
    "reward": 25,
    "solution": [
      {
        "anchor": 0,
        "turn": 2,
        "flip": false
      },
      {
        "anchor": 2,
        "turn": 0,
        "flip": false
      },
      {
        "anchor": 5,
        "turn": 0,
        "flip": false
      },
      {
        "anchor": 12,
        "turn": 1,
        "flip": false
      }
    ],
    "metrics": {
      "pieces": 4,
      "nodes": 18,
      "choices": 5,
      "solutionsAtLeast": 2,
      "placements": [
        48,
        9,
        48,
        8
      ]
    }
  },
  {
    "rows": 4,
    "cols": 5,
    "blocked": [
      0,
      4,
      15,
      19
    ],
    "pieces": [
      {
        "label": "A",
        "cells": [
          [
            0,
            1
          ],
          [
            1,
            1
          ],
          [
            1,
            2
          ],
          [
            0,
            0
          ]
        ]
      },
      {
        "label": "B",
        "cells": [
          [
            0,
            1
          ],
          [
            0,
            0
          ],
          [
            1,
            0
          ],
          [
            1,
            1
          ]
        ]
      },
      {
        "label": "C",
        "cells": [
          [
            1,
            1
          ],
          [
            1,
            0
          ],
          [
            0,
            0
          ],
          [
            1,
            2
          ]
        ]
      },
      {
        "label": "D",
        "cells": [
          [
            2,
            0
          ],
          [
            2,
            1
          ],
          [
            1,
            1
          ],
          [
            0,
            1
          ]
        ]
      }
    ],
    "id": "poly-6",
    "band": "Knobelmeister",
    "reward": 25,
    "solution": [
      {
        "anchor": 5,
        "turn": 0,
        "flip": false
      },
      {
        "anchor": 8,
        "turn": 0,
        "flip": false
      },
      {
        "anchor": 1,
        "turn": 3,
        "flip": false
      },
      {
        "anchor": 7,
        "turn": 1,
        "flip": false
      }
    ],
    "metrics": {
      "pieces": 4,
      "nodes": 16,
      "choices": 4,
      "solutionsAtLeast": 2,
      "placements": [
        26,
        8,
        44,
        44
      ]
    }
  }
];
