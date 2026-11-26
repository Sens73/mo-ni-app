// Originale aus dem geprüften Sonntagsrätsel #07; 4×4, 5×5 und 8×8.
export const kenkenEpisode = {
  "id": "sonntagsraetsel-07-kenkens",
  "number": 7,
  "title": "KenKens",
  "typeId": "kenken",
  "publishedAt": "2026-11-01T09:00:00.000Z",
  "videoId": "QugmHXn1roM",
  "video": "https://www.youtube.com/watch?v=QugmHXn1roM",
  "pdf": "./Sonntagsraetsel-07-KenKens-Aufgabenblatt.pdf?v=20261031",
  "levels": [
    {
      "id": "sunday-07-task-1",
      "number": 1,
      "band": "Sonntagsrätsel #7",
      "episodeId": "sonntagsraetsel-07-kenkens",
      "origin": "sunday",
      "reward": 10,
      "size": 4,
      "givens": {
        "11": 3
      },
      "cages": [
        {
          "target": 3,
          "op": "+",
          "cells": [
            0,
            1
          ]
        },
        {
          "target": 7,
          "op": "+",
          "cells": [
            2,
            6
          ]
        },
        {
          "target": 3,
          "op": "-",
          "cells": [
            3,
            7
          ]
        },
        {
          "target": 1,
          "op": "-",
          "cells": [
            4,
            5
          ]
        },
        {
          "target": 3,
          "op": "-",
          "cells": [
            8,
            12
          ]
        },
        {
          "target": 7,
          "op": "+",
          "cells": [
            9,
            13
          ]
        },
        {
          "target": 5,
          "op": "+",
          "cells": [
            10,
            14,
            15
          ]
        },
        {
          "target": 3,
          "op": "=",
          "cells": [
            11
          ]
        }
      ],
      "solution": [
        2,
        1,
        3,
        4,
        3,
        2,
        4,
        1,
        1,
        4,
        2,
        3,
        4,
        3,
        1,
        2
      ],
      "source": {
        "worksheet": "Sonntagsrätsel 07 – KenKens.tex",
        "worksheetTask": 1,
        "stars": 0,
        "original": "KenKen Lesson 3, Puzzle 3B",
        "transformation": "Keine; unveränderte Blattaufgabe"
      }
    },
    {
      "id": "sunday-07-task-2",
      "number": 2,
      "band": "Sonntagsrätsel #7",
      "episodeId": "sonntagsraetsel-07-kenkens",
      "origin": "sunday",
      "reward": 20,
      "size": 5,
      "givens": {
        "4": 4,
        "6": 1
      },
      "cages": [
        {
          "target": 60,
          "op": "*",
          "cells": [
            0,
            5,
            10
          ]
        },
        {
          "target": 6,
          "op": "*",
          "cells": [
            1,
            2,
            3
          ]
        },
        {
          "target": 4,
          "op": "=",
          "cells": [
            4
          ]
        },
        {
          "target": 1,
          "op": "=",
          "cells": [
            6
          ]
        },
        {
          "target": 7,
          "op": "+",
          "cells": [
            7,
            8
          ]
        },
        {
          "target": 1,
          "op": "-",
          "cells": [
            9,
            14
          ]
        },
        {
          "target": 9,
          "op": "+",
          "cells": [
            11,
            12
          ]
        },
        {
          "target": 3,
          "op": "+",
          "cells": [
            13,
            18
          ]
        },
        {
          "target": 2,
          "op": "/",
          "cells": [
            15,
            20
          ]
        },
        {
          "target": 36,
          "op": "*",
          "cells": [
            16,
            17,
            21
          ]
        },
        {
          "target": 4,
          "op": "-",
          "cells": [
            19,
            24
          ]
        },
        {
          "target": 9,
          "op": "+",
          "cells": [
            22,
            23
          ]
        }
      ],
      "solution": [
        5,
        2,
        1,
        3,
        4,
        4,
        1,
        2,
        5,
        3,
        3,
        5,
        4,
        1,
        2,
        1,
        4,
        3,
        2,
        5,
        2,
        3,
        5,
        4,
        1
      ],
      "source": {
        "worksheet": "Sonntagsrätsel 07 – KenKens.tex",
        "worksheetTask": 2,
        "stars": 0,
        "original": "KenKen Lesson 3, Puzzle 3C",
        "transformation": "Keine; unveränderte Blattaufgabe"
      }
    },
    {
      "id": "sunday-07-task-3",
      "number": 3,
      "band": "Sonntagsrätsel #7",
      "episodeId": "sonntagsraetsel-07-kenkens",
      "origin": "sunday",
      "reward": 40,
      "size": 8,
      "givens": {
        "7": 8,
        "30": 3,
        "50": 5,
        "60": 6
      },
      "cages": [
        {
          "target": 1,
          "op": "-",
          "cells": [
            0,
            8
          ]
        },
        {
          "target": 7,
          "op": "-",
          "cells": [
            1,
            9
          ]
        },
        {
          "target": 56,
          "op": "*",
          "cells": [
            2,
            3,
            10
          ]
        },
        {
          "target": 13,
          "op": "+",
          "cells": [
            4,
            5,
            13
          ]
        },
        {
          "target": 35,
          "op": "*",
          "cells": [
            6,
            14,
            22
          ]
        },
        {
          "target": 8,
          "op": "=",
          "cells": [
            7
          ]
        },
        {
          "target": 48,
          "op": "*",
          "cells": [
            11,
            12,
            19
          ]
        },
        {
          "target": 3,
          "op": "+",
          "cells": [
            15,
            23
          ]
        },
        {
          "target": 49,
          "op": "*",
          "cells": [
            16,
            24,
            25
          ]
        },
        {
          "target": 12,
          "op": "+",
          "cells": [
            17,
            18,
            26
          ]
        },
        {
          "target": 2,
          "op": "-",
          "cells": [
            20,
            21
          ]
        },
        {
          "target": 9,
          "op": "+",
          "cells": [
            27,
            28
          ]
        },
        {
          "target": 112,
          "op": "*",
          "cells": [
            29,
            37,
            38
          ]
        },
        {
          "target": 3,
          "op": "=",
          "cells": [
            30
          ]
        },
        {
          "target": 3,
          "op": "-",
          "cells": [
            31,
            39
          ]
        },
        {
          "target": 72,
          "op": "*",
          "cells": [
            32,
            33,
            40
          ]
        },
        {
          "target": 7,
          "op": "-",
          "cells": [
            34,
            42
          ]
        },
        {
          "target": 3,
          "op": "-",
          "cells": [
            35,
            36
          ]
        },
        {
          "target": 30,
          "op": "*",
          "cells": [
            41,
            49,
            57
          ]
        },
        {
          "target": 6,
          "op": "*",
          "cells": [
            43,
            51,
            52
          ]
        },
        {
          "target": 11,
          "op": "+",
          "cells": [
            44,
            45
          ]
        },
        {
          "target": 18,
          "op": "+",
          "cells": [
            46,
            54,
            62
          ]
        },
        {
          "target": 140,
          "op": "*",
          "cells": [
            47,
            55,
            63
          ]
        },
        {
          "target": 4,
          "op": "/",
          "cells": [
            48,
            56
          ]
        },
        {
          "target": 5,
          "op": "=",
          "cells": [
            50
          ]
        },
        {
          "target": 1,
          "op": "-",
          "cells": [
            53,
            61
          ]
        },
        {
          "target": 4,
          "op": "-",
          "cells": [
            58,
            59
          ]
        },
        {
          "target": 6,
          "op": "=",
          "cells": [
            60
          ]
        }
      ],
      "solution": [
        6,
        1,
        7,
        2,
        4,
        3,
        5,
        8,
        5,
        8,
        4,
        3,
        2,
        6,
        7,
        1,
        7,
        4,
        6,
        8,
        3,
        5,
        1,
        2,
        1,
        7,
        2,
        4,
        5,
        8,
        3,
        6,
        4,
        6,
        1,
        5,
        8,
        7,
        2,
        3,
        3,
        2,
        8,
        1,
        7,
        4,
        6,
        5,
        8,
        3,
        5,
        6,
        1,
        2,
        4,
        7,
        2,
        5,
        3,
        7,
        6,
        1,
        8,
        4
      ],
      "source": {
        "worksheet": "Sonntagsrätsel 07 – KenKens.tex",
        "worksheetTask": 3,
        "stars": 0,
        "original": "Mathematics Today, Oktober 2026, S. 65",
        "transformation": "Keine; unveränderte Blattaufgabe"
      }
    }
  ]
};
