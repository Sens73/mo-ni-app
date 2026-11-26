// Exact-cover and Hamilton-route uniqueness verified before inclusion.
export const beastMazeLevels = [
  {
    "kind": "maze",
    "rows": 4,
    "cols": 4,
    "blocked": [
      2,
      6,
      10
    ],
    "turns": {
      "0": "L",
      "1": "L"
    },
    "start": 3,
    "end": 12,
    "source": {
      "book": "Beast Academy Puzzles 1",
      "page": 149,
      "task": 3,
      "stars": 1,
      "variant": "Waagerecht gespiegelt"
    },
    "id": "ba1-maze-1",
    "band": "Entdecker",
    "reward": 10,
    "solution": [
      3,
      7,
      11,
      15,
      14,
      13,
      9,
      5,
      1,
      0,
      4,
      8,
      12
    ],
    "metrics": {
      "difficultyBasis": "Beast Academy source stars",
      "sourceStars": 1,
      "solutions": 1
    }
  },
  {
    "kind": "maze",
    "rows": 4,
    "cols": 4,
    "blocked": [
      5,
      6,
      7
    ],
    "turns": {
      "11": "R",
      "15": "R"
    },
    "start": 3,
    "end": 12,
    "source": {
      "book": "Beast Academy Puzzles 1",
      "page": 149,
      "task": 3,
      "stars": 1,
      "variant": "Um 90 Grad gedreht"
    },
    "id": "ba1-maze-2",
    "band": "Entdecker",
    "reward": 10,
    "solution": [
      3,
      2,
      1,
      0,
      4,
      8,
      9,
      10,
      11,
      15,
      14,
      13,
      12
    ],
    "metrics": {
      "difficultyBasis": "Beast Academy source stars",
      "sourceStars": 1,
      "solutions": 1
    }
  },
  {
    "kind": "maze",
    "rows": 4,
    "cols": 4,
    "blocked": [
      14
    ],
    "turns": {
      "10": "R"
    },
    "start": 15,
    "end": 7,
    "source": {
      "book": "Beast Academy Puzzles 1",
      "page": 152,
      "task": 21,
      "stars": 2,
      "variant": "Waagerecht gespiegelt"
    },
    "id": "ba1-maze-3",
    "band": "Tüftler",
    "reward": 15,
    "solution": [
      15,
      11,
      10,
      6,
      5,
      9,
      13,
      12,
      8,
      4,
      0,
      1,
      2,
      3,
      7
    ],
    "metrics": {
      "difficultyBasis": "Beast Academy source stars",
      "sourceStars": 2,
      "solutions": 1
    }
  },
  {
    "kind": "maze",
    "rows": 4,
    "cols": 4,
    "blocked": [
      4
    ],
    "turns": {
      "5": "L"
    },
    "start": 0,
    "end": 2,
    "source": {
      "book": "Beast Academy Puzzles 1",
      "page": 152,
      "task": 21,
      "stars": 2,
      "variant": "Um 90 Grad gedreht"
    },
    "id": "ba1-maze-4",
    "band": "Tüftler",
    "reward": 15,
    "solution": [
      0,
      1,
      5,
      6,
      10,
      9,
      8,
      12,
      13,
      14,
      15,
      11,
      7,
      3,
      2
    ],
    "metrics": {
      "difficultyBasis": "Beast Academy source stars",
      "sourceStars": 2,
      "solutions": 1
    }
  },
  {
    "kind": "maze",
    "rows": 5,
    "cols": 5,
    "blocked": [
      22
    ],
    "turns": {
      "8": "L",
      "12": "L",
      "13": "L"
    },
    "start": 7,
    "end": 6,
    "source": {
      "book": "Beast Academy Puzzles 1",
      "page": 156,
      "task": 43,
      "stars": 3,
      "variant": "Waagerecht gespiegelt"
    },
    "id": "ba1-maze-5",
    "band": "Knobelmeister",
    "reward": 25,
    "solution": [
      7,
      2,
      3,
      4,
      9,
      8,
      13,
      14,
      19,
      24,
      23,
      18,
      17,
      12,
      11,
      16,
      21,
      20,
      15,
      10,
      5,
      0,
      1,
      6
    ],
    "metrics": {
      "difficultyBasis": "Beast Academy source stars",
      "sourceStars": 3,
      "solutions": 1
    }
  },
  {
    "kind": "maze",
    "rows": 5,
    "cols": 5,
    "blocked": [
      10
    ],
    "turns": {
      "7": "R",
      "8": "R",
      "12": "R"
    },
    "start": 13,
    "end": 18,
    "source": {
      "book": "Beast Academy Puzzles 1",
      "page": 156,
      "task": 43,
      "stars": 3,
      "variant": "Um 90 Grad gedreht"
    },
    "id": "ba1-maze-6",
    "band": "Knobelmeister",
    "reward": 25,
    "solution": [
      13,
      14,
      9,
      4,
      3,
      8,
      7,
      2,
      1,
      0,
      5,
      6,
      11,
      12,
      17,
      16,
      15,
      20,
      21,
      22,
      23,
      24,
      19,
      18
    ],
    "metrics": {
      "difficultyBasis": "Beast Academy source stars",
      "sourceStars": 3,
      "solutions": 1
    }
  }
];
export const beastPolyLevels = [
  {
    "kind": "poly",
    "rows": 5,
    "cols": 3,
    "blocked": [
      0,
      1,
      4
    ],
    "pieces": [
      {
        "label": "O",
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
            1,
            1
          ]
        ]
      },
      {
        "label": "I",
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
            0,
            2
          ],
          [
            0,
            3
          ]
        ]
      },
      {
        "label": "L",
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
            0,
            2
          ],
          [
            1,
            2
          ]
        ]
      }
    ],
    "source": {
      "book": "Beast Academy Puzzles 1",
      "page": 21,
      "task": 1,
      "stars": 1,
      "variant": "Waagerecht gespiegelt"
    },
    "id": "ba1-poly-1",
    "band": "Entdecker",
    "reward": 10,
    "solution": [
      {
        "anchor": 10,
        "turn": 0,
        "flip": false
      },
      {
        "anchor": 3,
        "turn": 0,
        "flip": false
      },
      {
        "anchor": 2,
        "turn": 0,
        "flip": true
      }
    ],
    "metrics": {
      "difficultyBasis": "Beast Academy source stars",
      "sourceStars": 1,
      "solutions": 1
    }
  },
  {
    "kind": "poly",
    "rows": 3,
    "cols": 5,
    "blocked": [
      8,
      9,
      14
    ],
    "pieces": [
      {
        "label": "O",
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
            1,
            1
          ]
        ]
      },
      {
        "label": "I",
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
            0,
            2
          ],
          [
            0,
            3
          ]
        ]
      },
      {
        "label": "L",
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
            0,
            2
          ],
          [
            1,
            2
          ]
        ]
      }
    ],
    "source": {
      "book": "Beast Academy Puzzles 1",
      "page": 21,
      "task": 1,
      "stars": 1,
      "variant": "Um 90 Grad gedreht"
    },
    "id": "ba1-poly-2",
    "band": "Entdecker",
    "reward": 10,
    "solution": [
      {
        "anchor": 0,
        "turn": 0,
        "flip": false
      },
      {
        "anchor": 10,
        "turn": 1,
        "flip": false
      },
      {
        "anchor": 2,
        "turn": 1,
        "flip": false
      }
    ],
    "metrics": {
      "difficultyBasis": "Beast Academy source stars",
      "sourceStars": 1,
      "solutions": 1
    }
  },
  {
    "kind": "poly",
    "rows": 4,
    "cols": 4,
    "blocked": [
      5,
      8,
      12,
      13
    ],
    "pieces": [
      {
        "label": "L",
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
            0,
            2
          ],
          [
            1,
            2
          ]
        ]
      },
      {
        "label": "T",
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
            2,
            0
          ],
          [
            1,
            1
          ]
        ]
      },
      {
        "label": "S",
        "cells": [
          [
            1,
            0
          ],
          [
            2,
            0
          ],
          [
            0,
            1
          ],
          [
            1,
            1
          ]
        ]
      }
    ],
    "source": {
      "book": "Beast Academy Puzzles 1",
      "page": 24,
      "task": 13,
      "stars": 2,
      "variant": "Waagerecht gespiegelt"
    },
    "id": "ba1-poly-3",
    "band": "Tüftler",
    "reward": 15,
    "solution": [
      {
        "anchor": 0,
        "turn": 1,
        "flip": false
      },
      {
        "anchor": 3,
        "turn": 1,
        "flip": false
      },
      {
        "anchor": 9,
        "turn": 0,
        "flip": true
      }
    ],
    "metrics": {
      "difficultyBasis": "Beast Academy source stars",
      "sourceStars": 2,
      "solutions": 1
    }
  },
  {
    "kind": "poly",
    "rows": 4,
    "cols": 4,
    "blocked": [
      8,
      10,
      12,
      13
    ],
    "pieces": [
      {
        "label": "L",
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
            0,
            2
          ],
          [
            1,
            2
          ]
        ]
      },
      {
        "label": "T",
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
            2,
            0
          ],
          [
            1,
            1
          ]
        ]
      },
      {
        "label": "S",
        "cells": [
          [
            1,
            0
          ],
          [
            2,
            0
          ],
          [
            0,
            1
          ],
          [
            1,
            1
          ]
        ]
      }
    ],
    "source": {
      "book": "Beast Academy Puzzles 1",
      "page": 24,
      "task": 13,
      "stars": 2,
      "variant": "Um 90 Grad gedreht"
    },
    "id": "ba1-poly-4",
    "band": "Tüftler",
    "reward": 15,
    "solution": [
      {
        "anchor": 7,
        "turn": 0,
        "flip": true
      },
      {
        "anchor": 1,
        "turn": 0,
        "flip": false
      },
      {
        "anchor": 0,
        "turn": 1,
        "flip": false
      }
    ],
    "metrics": {
      "difficultyBasis": "Beast Academy source stars",
      "sourceStars": 2,
      "solutions": 1
    }
  },
  {
    "kind": "poly",
    "rows": 6,
    "cols": 4,
    "blocked": [
      0,
      2,
      3,
      8,
      10,
      14,
      17,
      23
    ],
    "pieces": [
      {
        "label": "L",
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
            0,
            2
          ],
          [
            1,
            2
          ]
        ]
      },
      {
        "label": "I",
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
            0,
            2
          ],
          [
            0,
            3
          ]
        ]
      },
      {
        "label": "S",
        "cells": [
          [
            1,
            0
          ],
          [
            2,
            0
          ],
          [
            0,
            1
          ],
          [
            1,
            1
          ]
        ]
      },
      {
        "label": "T",
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
            2,
            0
          ],
          [
            1,
            1
          ]
        ]
      }
    ],
    "source": {
      "book": "Beast Academy Puzzles 1",
      "page": 28,
      "task": 29,
      "stars": 3,
      "variant": "Waagerecht gespiegelt"
    },
    "id": "ba1-poly-5",
    "band": "Knobelmeister",
    "reward": 25,
    "solution": [
      {
        "anchor": 18,
        "turn": 3,
        "flip": false
      },
      {
        "anchor": 7,
        "turn": 0,
        "flip": false
      },
      {
        "anchor": 9,
        "turn": 1,
        "flip": true
      },
      {
        "anchor": 1,
        "turn": 2,
        "flip": false
      }
    ],
    "metrics": {
      "difficultyBasis": "Beast Academy source stars",
      "sourceStars": 3,
      "solutions": 1
    }
  },
  {
    "kind": "poly",
    "rows": 4,
    "cols": 6,
    "blocked": [
      0,
      5,
      8,
      9,
      11,
      13,
      21,
      23
    ],
    "pieces": [
      {
        "label": "L",
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
            0,
            2
          ],
          [
            1,
            2
          ]
        ]
      },
      {
        "label": "I",
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
            0,
            2
          ],
          [
            0,
            3
          ]
        ]
      },
      {
        "label": "S",
        "cells": [
          [
            1,
            0
          ],
          [
            2,
            0
          ],
          [
            0,
            1
          ],
          [
            1,
            1
          ]
        ]
      },
      {
        "label": "T",
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
            2,
            0
          ],
          [
            1,
            1
          ]
        ]
      }
    ],
    "source": {
      "book": "Beast Academy Puzzles 1",
      "page": 28,
      "task": 29,
      "stars": 3,
      "variant": "Um 90 Grad gedreht"
    },
    "id": "ba1-poly-6",
    "band": "Knobelmeister",
    "reward": 25,
    "solution": [
      {
        "anchor": 6,
        "turn": 2,
        "flip": true
      },
      {
        "anchor": 1,
        "turn": 1,
        "flip": false
      },
      {
        "anchor": 14,
        "turn": 0,
        "flip": false
      },
      {
        "anchor": 10,
        "turn": 3,
        "flip": false
      }
    ],
    "metrics": {
      "difficultyBasis": "Beast Academy source stars",
      "sourceStars": 3,
      "solutions": 1
    }
  }
];
