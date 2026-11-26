// Original MO-Ni puzzles. Stable initial grids plus audited additions (seed 2026100711).
// Latin rows/columns and cage sums; repeats within cages are allowed.
export const sumdokuLevels = [
  {
    "id": "sumdoku-01",
    "size": 3,
    "cages": [
      {
        "cells": [
          0,
          3
        ],
        "sum": 4
      },
      {
        "cells": [
          1,
          4
        ],
        "sum": 5
      },
      {
        "cells": [
          2,
          5
        ],
        "sum": 3
      },
      {
        "cells": [
          6,
          7,
          8
        ],
        "sum": 6
      }
    ],
    "givens": {
      "3": 3,
      "8": 3
    },
    "solution": [
      1,
      3,
      2,
      3,
      2,
      1,
      2,
      1,
      3
    ],
    "title": "Erste Summen",
    "band": "Entdecker",
    "reward": 10,
    "number": 1,
    "difficulty": {
      "tier": 0,
      "band": "Entdecker",
      "basicFilled": 9,
      "combinedFilled": 9,
      "advancedFilled": 9,
      "combinationSteps": 0,
      "contradictions": 0,
      "probes": 0
    }
  },
  {
    "id": "sumdoku-02",
    "size": 3,
    "cages": [
      {
        "cells": [
          0,
          1
        ],
        "sum": 3
      },
      {
        "cells": [
          2
        ],
        "sum": 3
      },
      {
        "cells": [
          3,
          4,
          5
        ],
        "sum": 6
      },
      {
        "cells": [
          6
        ],
        "sum": 1
      },
      {
        "cells": [
          7
        ],
        "sum": 3
      },
      {
        "cells": [
          8
        ],
        "sum": 2
      }
    ],
    "givens": {},
    "solution": [
      2,
      1,
      3,
      3,
      2,
      1,
      1,
      3,
      2
    ],
    "title": "Weiterknobeln",
    "band": "Entdecker",
    "reward": 10,
    "number": 2,
    "difficulty": {
      "tier": 0,
      "band": "Entdecker",
      "basicFilled": 9,
      "combinedFilled": 9,
      "advancedFilled": 9,
      "combinationSteps": 0,
      "contradictions": 0,
      "probes": 0
    }
  },
  {
    "id": "sumdoku-03",
    "size": 3,
    "cages": [
      {
        "cells": [
          0,
          3,
          6
        ],
        "sum": 6
      },
      {
        "cells": [
          1,
          2,
          4
        ],
        "sum": 5
      },
      {
        "cells": [
          5
        ],
        "sum": 2
      },
      {
        "cells": [
          7
        ],
        "sum": 2
      },
      {
        "cells": [
          8
        ],
        "sum": 3
      }
    ],
    "givens": {},
    "solution": [
      2,
      3,
      1,
      3,
      1,
      2,
      1,
      2,
      3
    ],
    "title": "Neue Herausforderung",
    "band": "Entdecker",
    "reward": 10,
    "number": 3,
    "difficulty": {
      "tier": 0,
      "band": "Entdecker",
      "basicFilled": 9,
      "combinedFilled": 9,
      "advancedFilled": 9,
      "combinationSteps": 0,
      "contradictions": 0,
      "probes": 0
    }
  },
  {
    "id": "sumdoku-05",
    "size": 4,
    "cages": [
      {
        "cells": [
          0
        ],
        "sum": 4
      },
      {
        "cells": [
          1,
          2,
          3,
          6
        ],
        "sum": 8
      },
      {
        "cells": [
          4
        ],
        "sum": 1
      },
      {
        "cells": [
          5,
          9,
          10,
          14
        ],
        "sum": 9
      },
      {
        "cells": [
          7
        ],
        "sum": 4
      },
      {
        "cells": [
          8,
          12
        ],
        "sum": 5
      },
      {
        "cells": [
          11,
          15
        ],
        "sum": 5
      },
      {
        "cells": [
          13
        ],
        "sum": 4
      }
    ],
    "givens": {
      "2": 3,
      "15": 2
    },
    "solution": [
      4,
      2,
      3,
      1,
      1,
      3,
      2,
      4,
      2,
      1,
      4,
      3,
      3,
      4,
      1,
      2
    ],
    "title": "Erste Summen",
    "band": "Entdecker",
    "reward": 15,
    "number": 4,
    "difficulty": {
      "tier": 0,
      "band": "Entdecker",
      "basicFilled": 16,
      "combinedFilled": 16,
      "advancedFilled": 16,
      "combinationSteps": 0,
      "contradictions": 0,
      "probes": 0
    }
  },
  {
    "id": "sumdoku-06",
    "size": 4,
    "cages": [
      {
        "cells": [
          0,
          4
        ],
        "sum": 7
      },
      {
        "cells": [
          1
        ],
        "sum": 2
      },
      {
        "cells": [
          2
        ],
        "sum": 1
      },
      {
        "cells": [
          3
        ],
        "sum": 4
      },
      {
        "cells": [
          5
        ],
        "sum": 3
      },
      {
        "cells": [
          6,
          7,
          9,
          10
        ],
        "sum": 8
      },
      {
        "cells": [
          8,
          12,
          13
        ],
        "sum": 7
      },
      {
        "cells": [
          11
        ],
        "sum": 3
      },
      {
        "cells": [
          14
        ],
        "sum": 3
      },
      {
        "cells": [
          15
        ],
        "sum": 2
      }
    ],
    "givens": {},
    "solution": [
      3,
      2,
      1,
      4,
      4,
      3,
      2,
      1,
      2,
      1,
      4,
      3,
      1,
      4,
      3,
      2
    ],
    "title": "Weiterknobeln",
    "band": "Entdecker",
    "reward": 15,
    "number": 5,
    "difficulty": {
      "tier": 0,
      "band": "Entdecker",
      "basicFilled": 16,
      "combinedFilled": 16,
      "advancedFilled": 16,
      "combinationSteps": 0,
      "contradictions": 0,
      "probes": 0
    }
  },
  {
    "id": "sumdoku-07",
    "size": 4,
    "cages": [
      {
        "cells": [
          0,
          4
        ],
        "sum": 4
      },
      {
        "cells": [
          1,
          5,
          6,
          9
        ],
        "sum": 10
      },
      {
        "cells": [
          2
        ],
        "sum": 1
      },
      {
        "cells": [
          3,
          7
        ],
        "sum": 6
      },
      {
        "cells": [
          8
        ],
        "sum": 2
      },
      {
        "cells": [
          10,
          14
        ],
        "sum": 7
      },
      {
        "cells": [
          11
        ],
        "sum": 3
      },
      {
        "cells": [
          12,
          13
        ],
        "sum": 6
      },
      {
        "cells": [
          15
        ],
        "sum": 1
      }
    ],
    "givens": {},
    "solution": [
      3,
      4,
      1,
      2,
      1,
      3,
      2,
      4,
      2,
      1,
      4,
      3,
      4,
      2,
      3,
      1
    ],
    "title": "Neue Herausforderung",
    "band": "Entdecker",
    "reward": 15,
    "number": 6,
    "difficulty": {
      "tier": 0,
      "band": "Entdecker",
      "basicFilled": 16,
      "combinedFilled": 16,
      "advancedFilled": 16,
      "combinationSteps": 0,
      "contradictions": 0,
      "probes": 0
    }
  },
  {
    "id": "sumdoku-09",
    "size": 5,
    "cages": [
      {
        "cells": [
          0,
          1,
          6
        ],
        "sum": 6
      },
      {
        "cells": [
          2
        ],
        "sum": 3
      },
      {
        "cells": [
          3,
          4,
          9,
          14
        ],
        "sum": 15
      },
      {
        "cells": [
          5
        ],
        "sum": 5
      },
      {
        "cells": [
          7,
          8
        ],
        "sum": 6
      },
      {
        "cells": [
          10,
          11,
          16
        ],
        "sum": 7
      },
      {
        "cells": [
          12,
          13
        ],
        "sum": 7
      },
      {
        "cells": [
          15
        ],
        "sum": 3
      },
      {
        "cells": [
          17
        ],
        "sum": 5
      },
      {
        "cells": [
          18,
          23
        ],
        "sum": 3
      },
      {
        "cells": [
          19
        ],
        "sum": 2
      },
      {
        "cells": [
          20,
          21
        ],
        "sum": 9
      },
      {
        "cells": [
          22
        ],
        "sum": 1
      },
      {
        "cells": [
          24
        ],
        "sum": 3
      }
    ],
    "givens": {
      "1": 2,
      "21": 5
    },
    "solution": [
      1,
      2,
      3,
      5,
      4,
      5,
      3,
      2,
      4,
      1,
      2,
      1,
      4,
      3,
      5,
      3,
      4,
      5,
      1,
      2,
      4,
      5,
      1,
      2,
      3
    ],
    "title": "Erste Summen",
    "band": "Entdecker",
    "reward": 20,
    "number": 7,
    "difficulty": {
      "tier": 0,
      "band": "Entdecker",
      "basicFilled": 25,
      "combinedFilled": 25,
      "advancedFilled": 25,
      "combinationSteps": 0,
      "contradictions": 0,
      "probes": 0
    }
  },
  {
    "id": "sumdoku-11",
    "size": 5,
    "cages": [
      {
        "cells": [
          0,
          5
        ],
        "sum": 6
      },
      {
        "cells": [
          1,
          2
        ],
        "sum": 8
      },
      {
        "cells": [
          3
        ],
        "sum": 1
      },
      {
        "cells": [
          4,
          9,
          14
        ],
        "sum": 10
      },
      {
        "cells": [
          6
        ],
        "sum": 3
      },
      {
        "cells": [
          7,
          12
        ],
        "sum": 9
      },
      {
        "cells": [
          8,
          13
        ],
        "sum": 5
      },
      {
        "cells": [
          10,
          11
        ],
        "sum": 3
      },
      {
        "cells": [
          15,
          20
        ],
        "sum": 8
      },
      {
        "cells": [
          16,
          21
        ],
        "sum": 5
      },
      {
        "cells": [
          17,
          22
        ],
        "sum": 3
      },
      {
        "cells": [
          18
        ],
        "sum": 5
      },
      {
        "cells": [
          19,
          23,
          24
        ],
        "sum": 9
      }
    ],
    "givens": {},
    "solution": [
      2,
      5,
      3,
      1,
      4,
      4,
      3,
      5,
      2,
      1,
      1,
      2,
      4,
      3,
      5,
      3,
      4,
      1,
      5,
      2,
      5,
      1,
      2,
      4,
      3
    ],
    "title": "Neue Herausforderung",
    "band": "Entdecker",
    "reward": 20,
    "number": 8,
    "difficulty": {
      "tier": 0,
      "band": "Entdecker",
      "basicFilled": 25,
      "combinedFilled": 25,
      "advancedFilled": 25,
      "combinationSteps": 0,
      "contradictions": 0,
      "probes": 0
    }
  },
  {
    "id": "sumdoku-04",
    "size": 3,
    "cages": [
      {
        "cells": [
          0,
          1,
          4
        ],
        "sum": 6
      },
      {
        "cells": [
          2
        ],
        "sum": 3
      },
      {
        "cells": [
          3,
          6
        ],
        "sum": 4
      },
      {
        "cells": [
          5,
          7,
          8
        ],
        "sum": 5
      }
    ],
    "givens": {},
    "solution": [
      2,
      1,
      3,
      1,
      3,
      2,
      3,
      2,
      1
    ],
    "title": "Gut kombiniert",
    "band": "Tüftler",
    "reward": 10,
    "number": 9,
    "difficulty": {
      "tier": 1,
      "band": "Tüftler",
      "basicFilled": 1,
      "combinedFilled": 9,
      "advancedFilled": 9,
      "combinationSteps": 12,
      "contradictions": 0,
      "probes": 0
    }
  },
  {
    "id": "sumdoku-08",
    "size": 4,
    "cages": [
      {
        "cells": [
          0
        ],
        "sum": 2
      },
      {
        "cells": [
          1,
          4,
          5,
          6
        ],
        "sum": 7
      },
      {
        "cells": [
          2,
          3,
          7,
          11
        ],
        "sum": 12
      },
      {
        "cells": [
          8,
          9,
          12
        ],
        "sum": 9
      },
      {
        "cells": [
          10,
          13,
          14,
          15
        ],
        "sum": 10
      }
    ],
    "givens": {},
    "solution": [
      2,
      1,
      4,
      3,
      1,
      3,
      2,
      4,
      4,
      2,
      3,
      1,
      3,
      4,
      1,
      2
    ],
    "title": "Gut kombiniert",
    "band": "Tüftler",
    "reward": 15,
    "number": 10,
    "difficulty": {
      "tier": 1,
      "band": "Tüftler",
      "basicFilled": 1,
      "combinedFilled": 16,
      "advancedFilled": 16,
      "combinationSteps": 26,
      "contradictions": 0,
      "probes": 0
    }
  },
  {
    "id": "sumdoku-10",
    "size": 5,
    "cages": [
      {
        "cells": [
          0
        ],
        "sum": 5
      },
      {
        "cells": [
          1,
          2,
          6
        ],
        "sum": 12
      },
      {
        "cells": [
          3,
          7,
          8,
          9
        ],
        "sum": 10
      },
      {
        "cells": [
          4
        ],
        "sum": 2
      },
      {
        "cells": [
          5
        ],
        "sum": 1
      },
      {
        "cells": [
          10,
          15,
          20,
          21
        ],
        "sum": 12
      },
      {
        "cells": [
          11,
          12,
          13
        ],
        "sum": 11
      },
      {
        "cells": [
          14,
          18,
          19
        ],
        "sum": 8
      },
      {
        "cells": [
          16,
          17,
          22
        ],
        "sum": 7
      },
      {
        "cells": [
          23,
          24
        ],
        "sum": 7
      }
    ],
    "givens": {
      "9": 3
    },
    "solution": [
      5,
      4,
      3,
      1,
      2,
      1,
      5,
      2,
      4,
      3,
      3,
      2,
      4,
      5,
      1,
      2,
      1,
      5,
      3,
      4,
      4,
      3,
      1,
      2,
      5
    ],
    "title": "Weiterknobeln",
    "band": "Tüftler",
    "reward": 20,
    "number": 11,
    "difficulty": {
      "tier": 1,
      "band": "Tüftler",
      "basicFilled": 4,
      "combinedFilled": 25,
      "advancedFilled": 25,
      "combinationSteps": 39,
      "contradictions": 0,
      "probes": 0
    }
  },
  {
    "id": "sumdoku-12",
    "size": 5,
    "cages": [
      {
        "cells": [
          0
        ],
        "sum": 2
      },
      {
        "cells": [
          1,
          2
        ],
        "sum": 9
      },
      {
        "cells": [
          3,
          4,
          8,
          9
        ],
        "sum": 11
      },
      {
        "cells": [
          5,
          10
        ],
        "sum": 4
      },
      {
        "cells": [
          6,
          7,
          12
        ],
        "sum": 7
      },
      {
        "cells": [
          11,
          16,
          17,
          22
        ],
        "sum": 9
      },
      {
        "cells": [
          13,
          18
        ],
        "sum": 9
      },
      {
        "cells": [
          14,
          19,
          24
        ],
        "sum": 9
      },
      {
        "cells": [
          15
        ],
        "sum": 5
      },
      {
        "cells": [
          20
        ],
        "sum": 4
      },
      {
        "cells": [
          21
        ],
        "sum": 5
      },
      {
        "cells": [
          23
        ],
        "sum": 1
      }
    ],
    "givens": {},
    "solution": [
      2,
      4,
      5,
      3,
      1,
      3,
      1,
      4,
      2,
      5,
      1,
      3,
      2,
      5,
      4,
      5,
      2,
      1,
      4,
      3,
      4,
      5,
      3,
      1,
      2
    ],
    "title": "Gut kombiniert",
    "band": "Tüftler",
    "reward": 20,
    "number": 12,
    "difficulty": {
      "tier": 1,
      "band": "Tüftler",
      "basicFilled": 13,
      "combinedFilled": 25,
      "advancedFilled": 25,
      "combinationSteps": 31,
      "contradictions": 0,
      "probes": 0
    }
  },
  {
    "id": "sumdoku-13",
    "size": 4,
    "cages": [
      {
        "cells": [
          0,
          1,
          5
        ],
        "sum": 7
      },
      {
        "cells": [
          2
        ],
        "sum": 3
      },
      {
        "cells": [
          3,
          6,
          7
        ],
        "sum": 6
      },
      {
        "cells": [
          4,
          8,
          9,
          10,
          12
        ],
        "sum": 12
      },
      {
        "cells": [
          11,
          13,
          14,
          15
        ],
        "sum": 12
      }
    ],
    "givens": {},
    "solution": [
      1,
      4,
      3,
      2,
      4,
      2,
      1,
      3,
      3,
      1,
      2,
      4,
      2,
      3,
      4,
      1
    ],
    "difficulty": {
      "tier": 2,
      "band": "Knobelmeister",
      "basicFilled": 1,
      "combinedFilled": 3,
      "advancedFilled": 16,
      "combinationSteps": 18,
      "contradictions": 1,
      "probes": 1
    },
    "number": 13,
    "title": "Mit Möglichkeiten knobeln",
    "band": "Knobelmeister",
    "reward": 25
  },
  {
    "id": "sumdoku-14",
    "size": 4,
    "cages": [
      {
        "cells": [
          0,
          1,
          2
        ],
        "sum": 6
      },
      {
        "cells": [
          3,
          6,
          7,
          11
        ],
        "sum": 10
      },
      {
        "cells": [
          4,
          5
        ],
        "sum": 6
      },
      {
        "cells": [
          8
        ],
        "sum": 3
      },
      {
        "cells": [
          9,
          10,
          14,
          15
        ],
        "sum": 10
      },
      {
        "cells": [
          12,
          13
        ],
        "sum": 5
      }
    ],
    "givens": {},
    "solution": [
      2,
      3,
      1,
      4,
      4,
      2,
      3,
      1,
      3,
      1,
      4,
      2,
      1,
      4,
      2,
      3
    ],
    "difficulty": {
      "tier": 2,
      "band": "Knobelmeister",
      "basicFilled": 1,
      "combinedFilled": 3,
      "advancedFilled": 16,
      "combinationSteps": 21,
      "contradictions": 2,
      "probes": 4
    },
    "number": 14,
    "title": "Mit Möglichkeiten knobeln",
    "band": "Knobelmeister",
    "reward": 25
  },
  {
    "id": "sumdoku-15",
    "size": 5,
    "cages": [
      {
        "cells": [
          0,
          1,
          5
        ],
        "sum": 7
      },
      {
        "cells": [
          2,
          3,
          4,
          7,
          8
        ],
        "sum": 17
      },
      {
        "cells": [
          6,
          11,
          12,
          13
        ],
        "sum": 16
      },
      {
        "cells": [
          9,
          14,
          19,
          24
        ],
        "sum": 10
      },
      {
        "cells": [
          10,
          15,
          20,
          21,
          22
        ],
        "sum": 16
      },
      {
        "cells": [
          16,
          17,
          18
        ],
        "sum": 6
      },
      {
        "cells": [
          23
        ],
        "sum": 3
      }
    ],
    "givens": {},
    "solution": [
      3,
      2,
      4,
      1,
      5,
      2,
      5,
      3,
      4,
      1,
      1,
      4,
      2,
      5,
      3,
      5,
      3,
      1,
      2,
      4,
      4,
      1,
      5,
      3,
      2
    ],
    "difficulty": {
      "tier": 2,
      "band": "Knobelmeister",
      "basicFilled": 1,
      "combinedFilled": 4,
      "advancedFilled": 25,
      "combinationSteps": 28,
      "contradictions": 1,
      "probes": 1
    },
    "number": 15,
    "title": "Mit Möglichkeiten knobeln",
    "band": "Knobelmeister",
    "reward": 25
  },
  {
    "id": "sumdoku-16",
    "size": 5,
    "cages": [
      {
        "cells": [
          0,
          5,
          6,
          7
        ],
        "sum": 12
      },
      {
        "cells": [
          1,
          2
        ],
        "sum": 6
      },
      {
        "cells": [
          3,
          4,
          8,
          9
        ],
        "sum": 12
      },
      {
        "cells": [
          10,
          11,
          15
        ],
        "sum": 11
      },
      {
        "cells": [
          12,
          13,
          14
        ],
        "sum": 8
      },
      {
        "cells": [
          16,
          17,
          18,
          22
        ],
        "sum": 10
      },
      {
        "cells": [
          19,
          24
        ],
        "sum": 8
      },
      {
        "cells": [
          20,
          21
        ],
        "sum": 3
      },
      {
        "cells": [
          23
        ],
        "sum": 5
      }
    ],
    "givens": {},
    "solution": [
      2,
      5,
      1,
      3,
      4,
      5,
      3,
      2,
      4,
      1,
      3,
      4,
      5,
      1,
      2,
      4,
      1,
      3,
      2,
      5,
      1,
      2,
      4,
      5,
      3
    ],
    "difficulty": {
      "tier": 2,
      "band": "Knobelmeister",
      "basicFilled": 1,
      "combinedFilled": 5,
      "advancedFilled": 25,
      "combinationSteps": 25,
      "contradictions": 3,
      "probes": 8
    },
    "number": 16,
    "title": "Mit Möglichkeiten knobeln",
    "band": "Knobelmeister",
    "reward": 25
  }
];
