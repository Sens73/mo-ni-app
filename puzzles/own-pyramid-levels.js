// Own reverse constructions, not based on a book puzzle.
export const ownPyramidLevels = [
  {
    "kind": "pyramid",
    "height": 5,
    "cols": 10,
    "rows": 10,
    "fields": [
      {
        "x": 0,
        "y": 8,
        "w": 2,
        "h": 2
      },
      {
        "x": 2,
        "y": 8,
        "w": 2,
        "h": 2
      },
      {
        "x": 4,
        "y": 8,
        "w": 2,
        "h": 2
      },
      {
        "x": 6,
        "y": 8,
        "w": 2,
        "h": 2
      },
      {
        "x": 8,
        "y": 8,
        "w": 2,
        "h": 2
      },
      {
        "x": 1,
        "y": 6,
        "w": 2,
        "h": 2
      },
      {
        "x": 3,
        "y": 6,
        "w": 2,
        "h": 2
      },
      {
        "x": 5,
        "y": 6,
        "w": 2,
        "h": 2
      },
      {
        "x": 7,
        "y": 6,
        "w": 2,
        "h": 2
      },
      {
        "x": 2,
        "y": 4,
        "w": 2,
        "h": 2
      },
      {
        "x": 4,
        "y": 4,
        "w": 2,
        "h": 2
      },
      {
        "x": 6,
        "y": 4,
        "w": 2,
        "h": 2
      },
      {
        "x": 3,
        "y": 2,
        "w": 2,
        "h": 2
      },
      {
        "x": 5,
        "y": 2,
        "w": 2,
        "h": 2
      },
      {
        "x": 4,
        "y": 0,
        "w": 2,
        "h": 2
      }
    ],
    "givens": {
      "0": 21,
      "1": 13,
      "2": 6,
      "3": 15,
      "4": 32
    },
    "bank": [
      8,
      7,
      9,
      17,
      1,
      2,
      8,
      1,
      6,
      5
    ],
    "domains": [
      [
        21
      ],
      [
        13
      ],
      [
        6
      ],
      [
        15
      ],
      [
        32
      ],
      [
        1,
        2,
        5,
        6,
        7,
        8,
        9,
        17
      ],
      [
        1,
        2,
        5,
        6,
        7,
        8,
        9,
        17
      ],
      [
        1,
        2,
        5,
        6,
        7,
        8,
        9,
        17
      ],
      [
        1,
        2,
        5,
        6,
        7,
        8,
        9,
        17
      ],
      [
        1,
        2,
        5,
        6,
        7,
        8,
        9,
        17
      ],
      [
        1,
        2,
        5,
        6,
        7,
        8,
        9,
        17
      ],
      [
        1,
        2,
        5,
        6,
        7,
        8,
        9,
        17
      ],
      [
        1,
        2,
        5,
        6,
        7,
        8,
        9,
        17
      ],
      [
        1,
        2,
        5,
        6,
        7,
        8,
        9,
        17
      ],
      [
        1,
        2,
        5,
        6,
        7,
        8,
        9,
        17
      ]
    ],
    "triples": [
      [
        0,
        1,
        5
      ],
      [
        1,
        2,
        6
      ],
      [
        2,
        3,
        7
      ],
      [
        3,
        4,
        8
      ],
      [
        5,
        6,
        9
      ],
      [
        6,
        7,
        10
      ],
      [
        7,
        8,
        11
      ],
      [
        9,
        10,
        12
      ],
      [
        10,
        11,
        13
      ],
      [
        12,
        13,
        14
      ]
    ],
    "constraints": [
      {
        "kind": "difference",
        "cells": [
          0,
          1,
          5
        ],
        "message": "Der obere Stein ist der Abstand der beiden Steine darunter."
      },
      {
        "kind": "difference",
        "cells": [
          1,
          2,
          6
        ],
        "message": "Der obere Stein ist der Abstand der beiden Steine darunter."
      },
      {
        "kind": "difference",
        "cells": [
          2,
          3,
          7
        ],
        "message": "Der obere Stein ist der Abstand der beiden Steine darunter."
      },
      {
        "kind": "difference",
        "cells": [
          3,
          4,
          8
        ],
        "message": "Der obere Stein ist der Abstand der beiden Steine darunter."
      },
      {
        "kind": "difference",
        "cells": [
          5,
          6,
          9
        ],
        "message": "Der obere Stein ist der Abstand der beiden Steine darunter."
      },
      {
        "kind": "difference",
        "cells": [
          6,
          7,
          10
        ],
        "message": "Der obere Stein ist der Abstand der beiden Steine darunter."
      },
      {
        "kind": "difference",
        "cells": [
          7,
          8,
          11
        ],
        "message": "Der obere Stein ist der Abstand der beiden Steine darunter."
      },
      {
        "kind": "difference",
        "cells": [
          9,
          10,
          12
        ],
        "message": "Der obere Stein ist der Abstand der beiden Steine darunter."
      },
      {
        "kind": "difference",
        "cells": [
          10,
          11,
          13
        ],
        "message": "Der obere Stein ist der Abstand der beiden Steine darunter."
      },
      {
        "kind": "difference",
        "cells": [
          12,
          13,
          14
        ],
        "message": "Der obere Stein ist der Abstand der beiden Steine darunter."
      },
      {
        "kind": "bank",
        "cells": [
          5,
          6,
          7,
          8,
          9,
          10,
          11,
          12,
          13,
          14
        ],
        "numbers": [
          8,
          7,
          9,
          17,
          1,
          2,
          8,
          1,
          6,
          5
        ],
        "message": "Nutze jede Zahl aus dem Vorrat genau so oft, wie sie dort steht."
      }
    ],
    "id": "own-pyramid-20261007-easy",
    "band": "Entdecker",
    "reward": 10,
    "solution": [
      21,
      13,
      6,
      15,
      32,
      8,
      7,
      9,
      17,
      1,
      2,
      8,
      1,
      6,
      5
    ],
    "origin": "own",
    "source": {
      "creator": "MO-Ni",
      "method": "Rückwärtskonstruktion aus eigener unterer Zahlenreihe",
      "seed": 2026100721,
      "trial": 0
    },
    "metrics": {
      "difficultyBasis": "pyramid reasoning strategies",
      "basicFilled": 15,
      "combinedFilled": 15,
      "total": 15,
      "solutions": 1,
      "minimumGivens": 1,
      "searchDepth": 0
    }
  },
  {
    "kind": "pyramid",
    "height": 5,
    "cols": 10,
    "rows": 10,
    "fields": [
      {
        "x": 0,
        "y": 8,
        "w": 2,
        "h": 2
      },
      {
        "x": 2,
        "y": 8,
        "w": 2,
        "h": 2
      },
      {
        "x": 4,
        "y": 8,
        "w": 2,
        "h": 2
      },
      {
        "x": 6,
        "y": 8,
        "w": 2,
        "h": 2
      },
      {
        "x": 8,
        "y": 8,
        "w": 2,
        "h": 2
      },
      {
        "x": 1,
        "y": 6,
        "w": 2,
        "h": 2
      },
      {
        "x": 3,
        "y": 6,
        "w": 2,
        "h": 2
      },
      {
        "x": 5,
        "y": 6,
        "w": 2,
        "h": 2
      },
      {
        "x": 7,
        "y": 6,
        "w": 2,
        "h": 2
      },
      {
        "x": 2,
        "y": 4,
        "w": 2,
        "h": 2
      },
      {
        "x": 4,
        "y": 4,
        "w": 2,
        "h": 2
      },
      {
        "x": 6,
        "y": 4,
        "w": 2,
        "h": 2
      },
      {
        "x": 3,
        "y": 2,
        "w": 2,
        "h": 2
      },
      {
        "x": 5,
        "y": 2,
        "w": 2,
        "h": 2
      },
      {
        "x": 4,
        "y": 0,
        "w": 2,
        "h": 2
      }
    ],
    "givens": {
      "7": 1
    },
    "bank": [
      22,
      11,
      5,
      6,
      32,
      11,
      6,
      26,
      5,
      5,
      25,
      0,
      20,
      20
    ],
    "domains": [
      [
        0,
        5,
        6,
        11,
        20,
        22,
        25,
        26,
        32
      ],
      [
        0,
        5,
        6,
        11,
        20,
        22,
        25,
        26,
        32
      ],
      [
        0,
        5,
        6,
        11,
        20,
        22,
        25,
        26,
        32
      ],
      [
        0,
        5,
        6,
        11,
        20,
        22,
        25,
        26,
        32
      ],
      [
        0,
        5,
        6,
        11,
        20,
        22,
        25,
        26,
        32
      ],
      [
        0,
        5,
        6,
        11,
        20,
        22,
        25,
        26,
        32
      ],
      [
        0,
        5,
        6,
        11,
        20,
        22,
        25,
        26,
        32
      ],
      [
        1
      ],
      [
        0,
        5,
        6,
        11,
        20,
        22,
        25,
        26,
        32
      ],
      [
        0,
        5,
        6,
        11,
        20,
        22,
        25,
        26,
        32
      ],
      [
        0,
        5,
        6,
        11,
        20,
        22,
        25,
        26,
        32
      ],
      [
        0,
        5,
        6,
        11,
        20,
        22,
        25,
        26,
        32
      ],
      [
        0,
        5,
        6,
        11,
        20,
        22,
        25,
        26,
        32
      ],
      [
        0,
        5,
        6,
        11,
        20,
        22,
        25,
        26,
        32
      ],
      [
        0,
        5,
        6,
        11,
        20,
        22,
        25,
        26,
        32
      ]
    ],
    "triples": [
      [
        0,
        1,
        5
      ],
      [
        1,
        2,
        6
      ],
      [
        2,
        3,
        7
      ],
      [
        3,
        4,
        8
      ],
      [
        5,
        6,
        9
      ],
      [
        6,
        7,
        10
      ],
      [
        7,
        8,
        11
      ],
      [
        9,
        10,
        12
      ],
      [
        10,
        11,
        13
      ],
      [
        12,
        13,
        14
      ]
    ],
    "constraints": [
      {
        "kind": "difference",
        "cells": [
          0,
          1,
          5
        ],
        "message": "Der obere Stein ist der Abstand der beiden Steine darunter."
      },
      {
        "kind": "difference",
        "cells": [
          1,
          2,
          6
        ],
        "message": "Der obere Stein ist der Abstand der beiden Steine darunter."
      },
      {
        "kind": "difference",
        "cells": [
          2,
          3,
          7
        ],
        "message": "Der obere Stein ist der Abstand der beiden Steine darunter."
      },
      {
        "kind": "difference",
        "cells": [
          3,
          4,
          8
        ],
        "message": "Der obere Stein ist der Abstand der beiden Steine darunter."
      },
      {
        "kind": "difference",
        "cells": [
          5,
          6,
          9
        ],
        "message": "Der obere Stein ist der Abstand der beiden Steine darunter."
      },
      {
        "kind": "difference",
        "cells": [
          6,
          7,
          10
        ],
        "message": "Der obere Stein ist der Abstand der beiden Steine darunter."
      },
      {
        "kind": "difference",
        "cells": [
          7,
          8,
          11
        ],
        "message": "Der obere Stein ist der Abstand der beiden Steine darunter."
      },
      {
        "kind": "difference",
        "cells": [
          9,
          10,
          12
        ],
        "message": "Der obere Stein ist der Abstand der beiden Steine darunter."
      },
      {
        "kind": "difference",
        "cells": [
          10,
          11,
          13
        ],
        "message": "Der obere Stein ist der Abstand der beiden Steine darunter."
      },
      {
        "kind": "difference",
        "cells": [
          12,
          13,
          14
        ],
        "message": "Der obere Stein ist der Abstand der beiden Steine darunter."
      },
      {
        "kind": "bank",
        "cells": [
          0,
          1,
          2,
          3,
          4,
          5,
          6,
          8,
          9,
          10,
          11,
          12,
          13,
          14
        ],
        "numbers": [
          22,
          11,
          5,
          6,
          32,
          11,
          6,
          26,
          5,
          5,
          25,
          0,
          20,
          20
        ],
        "message": "Nutze jede Zahl aus dem Vorrat genau so oft, wie sie dort steht."
      }
    ],
    "id": "own-pyramid-20261007-medium",
    "band": "Tüftler",
    "reward": 15,
    "solution": [
      22,
      11,
      5,
      6,
      32,
      11,
      6,
      1,
      26,
      5,
      5,
      25,
      0,
      20,
      20
    ],
    "origin": "own",
    "source": {
      "creator": "MO-Ni",
      "method": "Rückwärtskonstruktion aus eigener unterer Zahlenreihe",
      "seed": 2026100721,
      "trial": 1
    },
    "metrics": {
      "difficultyBasis": "pyramid reasoning strategies",
      "basicFilled": 1,
      "combinedFilled": 15,
      "total": 15,
      "solutions": 1,
      "minimumGivens": 1,
      "searchDepth": 0
    }
  },
  {
    "kind": "pyramid",
    "height": 5,
    "cols": 10,
    "rows": 10,
    "fields": [
      {
        "x": 0,
        "y": 8,
        "w": 2,
        "h": 2
      },
      {
        "x": 2,
        "y": 8,
        "w": 2,
        "h": 2
      },
      {
        "x": 4,
        "y": 8,
        "w": 2,
        "h": 2
      },
      {
        "x": 6,
        "y": 8,
        "w": 2,
        "h": 2
      },
      {
        "x": 8,
        "y": 8,
        "w": 2,
        "h": 2
      },
      {
        "x": 1,
        "y": 6,
        "w": 2,
        "h": 2
      },
      {
        "x": 3,
        "y": 6,
        "w": 2,
        "h": 2
      },
      {
        "x": 5,
        "y": 6,
        "w": 2,
        "h": 2
      },
      {
        "x": 7,
        "y": 6,
        "w": 2,
        "h": 2
      },
      {
        "x": 2,
        "y": 4,
        "w": 2,
        "h": 2
      },
      {
        "x": 4,
        "y": 4,
        "w": 2,
        "h": 2
      },
      {
        "x": 6,
        "y": 4,
        "w": 2,
        "h": 2
      },
      {
        "x": 3,
        "y": 2,
        "w": 2,
        "h": 2
      },
      {
        "x": 5,
        "y": 2,
        "w": 2,
        "h": 2
      },
      {
        "x": 4,
        "y": 0,
        "w": 2,
        "h": 2
      }
    ],
    "givens": {
      "0": 30
    },
    "bank": [
      6,
      4,
      24,
      12,
      24,
      2,
      20,
      12,
      22,
      18,
      8,
      4,
      10,
      6
    ],
    "domains": [
      [
        30
      ],
      [
        2,
        4,
        6,
        8,
        10,
        12,
        18,
        20,
        22,
        24
      ],
      [
        2,
        4,
        6,
        8,
        10,
        12,
        18,
        20,
        22,
        24
      ],
      [
        2,
        4,
        6,
        8,
        10,
        12,
        18,
        20,
        22,
        24
      ],
      [
        2,
        4,
        6,
        8,
        10,
        12,
        18,
        20,
        22,
        24
      ],
      [
        2,
        4,
        6,
        8,
        10,
        12,
        18,
        20,
        22,
        24
      ],
      [
        2,
        4,
        6,
        8,
        10,
        12,
        18,
        20,
        22,
        24
      ],
      [
        2,
        4,
        6,
        8,
        10,
        12,
        18,
        20,
        22,
        24
      ],
      [
        2,
        4,
        6,
        8,
        10,
        12,
        18,
        20,
        22,
        24
      ],
      [
        2,
        4,
        6,
        8,
        10,
        12,
        18,
        20,
        22,
        24
      ],
      [
        2,
        4,
        6,
        8,
        10,
        12,
        18,
        20,
        22,
        24
      ],
      [
        2,
        4,
        6,
        8,
        10,
        12,
        18,
        20,
        22,
        24
      ],
      [
        2,
        4,
        6,
        8,
        10,
        12,
        18,
        20,
        22,
        24
      ],
      [
        2,
        4,
        6,
        8,
        10,
        12,
        18,
        20,
        22,
        24
      ],
      [
        2,
        4,
        6,
        8,
        10,
        12,
        18,
        20,
        22,
        24
      ]
    ],
    "triples": [
      [
        0,
        1,
        5
      ],
      [
        1,
        2,
        6
      ],
      [
        2,
        3,
        7
      ],
      [
        3,
        4,
        8
      ],
      [
        5,
        6,
        9
      ],
      [
        6,
        7,
        10
      ],
      [
        7,
        8,
        11
      ],
      [
        9,
        10,
        12
      ],
      [
        10,
        11,
        13
      ],
      [
        12,
        13,
        14
      ]
    ],
    "constraints": [
      {
        "kind": "difference",
        "cells": [
          0,
          1,
          5
        ],
        "message": "Der obere Stein ist der Abstand der beiden Steine darunter."
      },
      {
        "kind": "difference",
        "cells": [
          1,
          2,
          6
        ],
        "message": "Der obere Stein ist der Abstand der beiden Steine darunter."
      },
      {
        "kind": "difference",
        "cells": [
          2,
          3,
          7
        ],
        "message": "Der obere Stein ist der Abstand der beiden Steine darunter."
      },
      {
        "kind": "difference",
        "cells": [
          3,
          4,
          8
        ],
        "message": "Der obere Stein ist der Abstand der beiden Steine darunter."
      },
      {
        "kind": "difference",
        "cells": [
          5,
          6,
          9
        ],
        "message": "Der obere Stein ist der Abstand der beiden Steine darunter."
      },
      {
        "kind": "difference",
        "cells": [
          6,
          7,
          10
        ],
        "message": "Der obere Stein ist der Abstand der beiden Steine darunter."
      },
      {
        "kind": "difference",
        "cells": [
          7,
          8,
          11
        ],
        "message": "Der obere Stein ist der Abstand der beiden Steine darunter."
      },
      {
        "kind": "difference",
        "cells": [
          9,
          10,
          12
        ],
        "message": "Der obere Stein ist der Abstand der beiden Steine darunter."
      },
      {
        "kind": "difference",
        "cells": [
          10,
          11,
          13
        ],
        "message": "Der obere Stein ist der Abstand der beiden Steine darunter."
      },
      {
        "kind": "difference",
        "cells": [
          12,
          13,
          14
        ],
        "message": "Der obere Stein ist der Abstand der beiden Steine darunter."
      },
      {
        "kind": "bank",
        "cells": [
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          9,
          10,
          11,
          12,
          13,
          14
        ],
        "numbers": [
          6,
          4,
          24,
          12,
          24,
          2,
          20,
          12,
          22,
          18,
          8,
          4,
          10,
          6
        ],
        "message": "Nutze jede Zahl aus dem Vorrat genau so oft, wie sie dort steht."
      }
    ],
    "id": "own-pyramid-20261007-hard",
    "band": "Knobelmeister",
    "reward": 25,
    "solution": [
      30,
      6,
      4,
      24,
      12,
      24,
      2,
      20,
      12,
      22,
      18,
      8,
      4,
      10,
      6
    ],
    "origin": "own",
    "source": {
      "creator": "MO-Ni",
      "method": "Rückwärtskonstruktion aus eigener unterer Zahlenreihe",
      "seed": 2026100721,
      "trial": 18
    },
    "metrics": {
      "difficultyBasis": "pyramid reasoning strategies",
      "basicFilled": 1,
      "combinedFilled": 1,
      "total": 15,
      "solutions": 1,
      "minimumGivens": 1,
      "searchDepth": 4
    }
  }
];
