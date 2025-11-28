/**
 * MSD Training Data - 4PL Parameters (WEIGHTED REFITTED)
 * Optimized using weighted least squares (1/y^2 weighting)
 * Starting from Initial parameters, improved iteratively
 * Target: All assays ≤1% error
 */

export const MSD_TRAINING_DATA = {
  "E3_P4": {
    "GM-CSF": {
      "standards": [
        {
          "concentration": 0,
          "signals": [
            119,
            98
          ],
          "mean": 109
        },
        {
          "concentration": 1.1279296875,
          "signals": [
            1658,
            1591
          ],
          "mean": 1625
        },
        {
          "concentration": 4.51171875,
          "signals": [
            6241,
            5432
          ],
          "mean": 5837
        },
        {
          "concentration": 18.046875,
          "signals": [
            19341,
            21411
          ],
          "mean": 20376
        },
        {
          "concentration": 72.1875,
          "signals": [
            93083,
            77758
          ],
          "mean": 85421
        },
        {
          "concentration": 288.75,
          "signals": [
            301744,
            305792
          ],
          "mean": 303768
        },
        {
          "concentration": 1155,
          "signals": [
            1342780,
            1100625
          ],
          "mean": 1221703
        },
        {
          "concentration": 4620,
          "signals": [
            1759497,
            1836747
          ],
          "mean": 1798122
        }
      ],
      "params": {
        "Assay": "GM-CSF",
        "Spot": 1,
        "Algorithm": "FourPL",
        "Algorithm Parameter: Initial Top": 1816103.22,
        "Algorithm Parameter: Initial Bottom": 97.65,
        "Algorithm Parameter: Initial MidPoint": 850.576094685949,
        "Algorithm Parameter: Initial HillSlope": 1,
        "Algorithm Parameter: Weighting": "1/y^2",
        "Algorithm Parameter: Max Iteration": 500,
        "Fit Statistic: RSquared": 0.974965249226462,
        "Algorithm Parameter: Calc. Top": 2905098.29844322,
        "Algorithm Parameter: Calc. Bottom": 108.968674844817,
        "Algorithm Parameter: Calc. MidPoint": 2356.39212117977,
        "Algorithm Parameter: Calc. HillSlope": 0.998425958109281,
        "Detection Limits: Calc. Low": 0.0298835440667179,
        "Detection Limits: Calc. High": 4620
      }
    },
    "IFN-γ": {
      "standards": [
        {
          "concentration": 0,
          "signals": [
            597,
            580
          ],
          "mean": 588.5
        },
        {
          "concentration": 3.515625,
          "signals": [
            1797,
            1775
          ],
          "mean": 1786
        },
        {
          "concentration": 14.0625,
          "signals": [
            5578,
            6010
          ],
          "mean": 5794
        },
        {
          "concentration": 56.25,
          "signals": [
            19956,
            20623
          ],
          "mean": 20289.5
        },
        {
          "concentration": 225,
          "signals": [
            69328,
            71225
          ],
          "mean": 70276.5
        },
        {
          "concentration": 900,
          "signals": [
            275357,
            280621
          ],
          "mean": 277989
        },
        {
          "concentration": 3600,
          "signals": [
            829374,
            843093
          ],
          "mean": 836233.5
        },
        {
          "concentration": 14400,
          "signals": [
            1027930,
            1021710
          ],
          "mean": 1024820
        }
      ],
      "params": {
        "Assay": "IFN-γ",
        "Spot": 2,
        "Algorithm": "FourPL",
        "Algorithm Parameter: Initial Top": 1045016.7,
        "Algorithm Parameter: Initial Bottom": 133.2,
        "Algorithm Parameter: Initial MidPoint": 8213.97460429925,
        "Algorithm Parameter: Initial HillSlope": 1,
        "Algorithm Parameter: Weighting": "1/y^2",
        "Algorithm Parameter: Max Iteration": 500,
        "Fit Statistic: RSquared": 0.999779088470839,
        "Algorithm Parameter: Calc. Top": 591876630.598236,
        "Algorithm Parameter: Calc. Bottom": 154.728759682777,
        "Algorithm Parameter: Calc. MidPoint": 9062274.96386985,
        "Algorithm Parameter: Calc. HillSlope": 1.01454130577637,
        "Detection Limits: Calc. Low": 0.72812917734397,
        "Detection Limits: Calc. High": 16050
      }
    },
    "IL-10": {
      "standards": [
        {
          "concentration": 0,
          "signals": [
            167,
            159
          ],
          "mean": 163
        },
        {
          "concentration": 0.9765625,
          "signals": [
            503,
            485
          ],
          "mean": 494
        },
        {
          "concentration": 3.90625,
          "signals": [
            1938,
            1894
          ],
          "mean": 1916
        },
        {
          "concentration": 15.625,
          "signals": [
            8307,
            8053
          ],
          "mean": 8180
        },
        {
          "concentration": 62.5,
          "signals": [
            35102,
            37196
          ],
          "mean": 36149
        },
        {
          "concentration": 250,
          "signals": [
            164415,
            166174
          ],
          "mean": 165294.5
        },
        {
          "concentration": 1000,
          "signals": [
            641141,
            655472
          ],
          "mean": 648306.5
        },
        {
          "concentration": 4000,
          "signals": [
            814927,
            828997
          ],
          "mean": 821962
        }
      ],
      "params": {
        "Assay": "IL-10",
        "Spot": 8,
        "Algorithm": "FourPL",
        "Algorithm Parameter: Initial Top": 848730.27,
        "Algorithm Parameter: Initial Bottom": 95.6,
        "Algorithm Parameter: Initial MidPoint": 46.2250060074453,
        "Algorithm Parameter: Initial HillSlope": 1,
        "Algorithm Parameter: Weighting": "1/y^2",
        "Algorithm Parameter: Max Iteration": 500,
        "Fit Statistic: RSquared": 0.99979515079888,
        "Algorithm Parameter: Calc. Top": 3236959.22693244,
        "Algorithm Parameter: Calc. Bottom": 102.6474904861802,
        "Algorithm Parameter: Calc. MidPoint": 598.7618039740266,
        "Algorithm Parameter: Calc. HillSlope": 1.0272505485820078,
        "Detection Limits: Calc. Low": 0.0452199332063891,
        "Detection Limits: Calc. High": 2015
      }
    },
    "IL-1β": {
      "standards": [
        {
          "concentration": 0,
          "signals": [
            102,
            119
          ],
          "mean": 110.5
        },
        {
          "concentration": 0.576171875,
          "signals": [
            355,
            357
          ],
          "mean": 356
        },
        {
          "concentration": 2.3046875,
          "signals": [
            1510,
            1510
          ],
          "mean": 1510
        },
        {
          "concentration": 9.21875,
          "signals": [
            6726,
            6759
          ],
          "mean": 6742.5
        },
        {
          "concentration": 36.875,
          "signals": [
            27330,
            28169
          ],
          "mean": 27749.5
        },
        {
          "concentration": 147.5,
          "signals": [
            108024,
            109909
          ],
          "mean": 108966.5
        },
        {
          "concentration": 590,
          "signals": [
            427822,
            435225
          ],
          "mean": 431523.5
        },
        {
          "concentration": 2360,
          "signals": [
            873758,
            883848
          ],
          "mean": 878803
        }
      ],
      "params": {
        "Assay": "IL-1β",
        "Spot": 3,
        "Algorithm": "FourPL",
        "Algorithm Parameter: Initial Top": 1366300.225,
        "Algorithm Parameter: Initial Bottom": 94.6,
        "Algorithm Parameter: Initial MidPoint": 33.1346447715777,
        "Algorithm Parameter: Initial HillSlope": 1,
        "Algorithm Parameter: Weighting": "1/y^2",
        "Algorithm Parameter: Max Iteration": 500,
        "Fit Statistic: RSquared": 0.999941630927123,
        "Algorithm Parameter: Calc. Top": 6608944.59826725,
        "Algorithm Parameter: Calc. Bottom": 111.47273600322889,
        "Algorithm Parameter: Calc. MidPoint": 415.7118618299121,
        "Algorithm Parameter: Calc. HillSlope": 1.0786446711929059,
        "Detection Limits: Calc. Low": 0.0348553394683391,
        "Detection Limits: Calc. High": 2220
      }
    },
    "IL-2": {
      "standards": [
        {
          "concentration": 0,
          "signals": [
            104,
            103
          ],
          "mean": 103.5
        },
        {
          "concentration": 0.390625,
          "signals": [
            257,
            263
          ],
          "mean": 260
        },
        {
          "concentration": 1.5625,
          "signals": [
            881,
            878
          ],
          "mean": 879.5
        },
        {
          "concentration": 6.25,
          "signals": [
            3273,
            3281
          ],
          "mean": 3277
        },
        {
          "concentration": 25,
          "signals": [
            12252,
            12326
          ],
          "mean": 12289
        },
        {
          "concentration": 100,
          "signals": [
            44553,
            44904
          ],
          "mean": 44728.5
        },
        {
          "concentration": 400,
          "signals": [
            152836,
            153554
          ],
          "mean": 153195
        },
        {
          "concentration": 1600,
          "signals": [
            381352,
            383923
          ],
          "mean": 382637.5
        }
      ],
      "params": {
        "Assay": "IL-2",
        "Spot": 4,
        "Algorithm": "FourPL",
        "Algorithm Parameter: Initial Top": 224728.03,
        "Algorithm Parameter: Initial Bottom": 95.45,
        "Algorithm Parameter: Initial MidPoint": 7.45642956648987,
        "Algorithm Parameter: Initial HillSlope": 1,
        "Algorithm Parameter: Weighting": "1/y^2",
        "Algorithm Parameter: Max Iteration": 500,
        "Fit Statistic: RSquared": 0.999883473309578,
        "Algorithm Parameter: Calc. Top": 1558005.82503112,
        "Algorithm Parameter: Calc. Bottom": 103.82304675242071,
        "Algorithm Parameter: Calc. MidPoint": 42.12895517378082,
        "Algorithm Parameter: Calc. HillSlope": 1.0050302183348088,
        "Detection Limits: Calc. Low": 0.0332937594373231,
        "Detection Limits: Calc. High": 945
      }
    },
    "IL-4": {
      "standards": [
        {
          "concentration": 0,
          "signals": [
            163,
            156
          ],
          "mean": 159.5
        },
        {
          "concentration": 0.390625,
          "signals": [
            366,
            340
          ],
          "mean": 353
        },
        {
          "concentration": 1.5625,
          "signals": [
            1301,
            1294
          ],
          "mean": 1297.5
        },
        {
          "concentration": 6.25,
          "signals": [
            4800,
            4899
          ],
          "mean": 4849.5
        },
        {
          "concentration": 25,
          "signals": [
            17734,
            18296
          ],
          "mean": 18015
        },
        {
          "concentration": 100,
          "signals": [
            63969,
            66459
          ],
          "mean": 65214
        },
        {
          "concentration": 400,
          "signals": [
            221363,
            227705
          ],
          "mean": 224534
        },
        {
          "concentration": 1600,
          "signals": [
            612437,
            627494
          ],
          "mean": 619965.5
        }
      ],
      "params": {
        "Assay": "IL-4",
        "Spot": 5,
        "Algorithm": "FourPL",
        "Algorithm Parameter: Initial Top": 1436146.27,
        "Algorithm Parameter: Initial Bottom": 130.85,
        "Algorithm Parameter: Initial MidPoint": 36.8048394620026,
        "Algorithm Parameter: Initial HillSlope": 1,
        "Algorithm Parameter: Weighting": "1/y^2",
        "Algorithm Parameter: Max Iteration": 500,
        "Fit Statistic: RSquared": 0.999854670083671,
        "Algorithm Parameter: Calc. Top": 15338829.438117107,
        "Algorithm Parameter: Calc. Bottom": 106.8929999997246,
        "Algorithm Parameter: Calc. MidPoint": 363.0910199704922,
        "Algorithm Parameter: Calc. HillSlope": 1.069832029053938,
        "Detection Limits: Calc. Low": 0.0938615211739209,
        "Detection Limits: Calc. High": 825
      }
    },
    "IL-5": {
      "standards": [
        {
          "concentration": 0,
          "signals": [
            107,
            103
          ],
          "mean": 105
        },
        {
          "concentration": 0.9765625,
          "signals": [
            367,
            360
          ],
          "mean": 363.5
        },
        {
          "concentration": 3.90625,
          "signals": [
            1426,
            1420
          ],
          "mean": 1423
        },
        {
          "concentration": 15.625,
          "signals": [
            5661,
            5719
          ],
          "mean": 5690
        },
        {
          "concentration": 62.5,
          "signals": [
            21848,
            22547
          ],
          "mean": 22197.5
        },
        {
          "concentration": 250,
          "signals": [
            81896,
            82896
          ],
          "mean": 82396
        },
        {
          "concentration": 1000,
          "signals": [
            268968,
            269675
          ],
          "mean": 269321.5
        },
        {
          "concentration": 4000,
          "signals": [
            652207,
            657560
          ],
          "mean": 654883.5
        }
      ],
      "params": {
        "Assay": "IL-5",
        "Spot": 6,
        "Algorithm": "FourPL",
        "Algorithm Parameter: Initial Top": 889462.56,
        "Algorithm Parameter: Initial Bottom": 88.35,
        "Algorithm Parameter: Initial MidPoint": 28.7686273888016,
        "Algorithm Parameter: Initial HillSlope": 1,
        "Algorithm Parameter: Weighting": "1/y^2",
        "Algorithm Parameter: Max Iteration": 500,
        "Fit Statistic: RSquared": 0.999818962044947,
        "Algorithm Parameter: Calc. Top": 455792.97666455,
        "Algorithm Parameter: Calc. Bottom": 94.2252879321008,
        "Algorithm Parameter: Calc. MidPoint": 58.0945821434028,
        "Algorithm Parameter: Calc. HillSlope": 1.10522640407591,
        "Detection Limits: Calc. Low": 0.0560855630596764,
        "Detection Limits: Calc. High": 2140
      }
    },
    "IL-6": {
      "standards": [
        {
          "concentration": 0,
          "signals": [
            116,
            112
          ],
          "mean": 114
        },
        {
          "concentration": 0.48828125,
          "signals": [
            377,
            383
          ],
          "mean": 380
        },
        {
          "concentration": 1.953125,
          "signals": [
            1473,
            1472
          ],
          "mean": 1472.5
        },
        {
          "concentration": 7.8125,
          "signals": [
            5792,
            5899
          ],
          "mean": 5845.5
        },
        {
          "concentration": 31.25,
          "signals": [
            22972,
            23721
          ],
          "mean": 23346.5
        },
        {
          "concentration": 125,
          "signals": [
            90338,
            92724
          ],
          "mean": 91531
        },
        {
          "concentration": 500,
          "signals": [
            318993,
            328664
          ],
          "mean": 323828.5
        },
        {
          "concentration": 2000,
          "signals": [
            730926,
            746780
          ],
          "mean": 738853
        }
      ],
      "params": {
        "Assay": "IL-6",
        "Spot": 7,
        "Algorithm": "FourPL",
        "Algorithm Parameter: Initial Top": 619028.495,
        "Algorithm Parameter: Initial Bottom": 105.45,
        "Algorithm Parameter: Initial MidPoint": 20.6223399786602,
        "Algorithm Parameter: Initial HillSlope": 1,
        "Algorithm Parameter: Weighting": "1/y^2",
        "Algorithm Parameter: Max Iteration": 500,
        "Fit Statistic: RSquared": 0.999789048733133,
        "Algorithm Parameter: Calc. Top": 10597188.1206945,
        "Algorithm Parameter: Calc. Bottom": 135.624598940707,
        "Algorithm Parameter: Calc. MidPoint": 165.08180098377113,
        "Algorithm Parameter: Calc. HillSlope": 1.0124700788822592,
        "Detection Limits: Calc. Low": 0.0906154133978282,
        "Detection Limits: Calc. High": 1040
      }
    },
    "MCP-1": {
      "standards": [
        {
          "concentration": 0,
          "signals": [
            100,
            103
          ],
          "mean": 101.5
        },
        {
          "concentration": 0.78125,
          "signals": [
            403,
            409
          ],
          "mean": 406
        },
        {
          "concentration": 3.125,
          "signals": [
            1618,
            1624
          ],
          "mean": 1621
        },
        {
          "concentration": 12.5,
          "signals": [
            6466,
            6580
          ],
          "mean": 6523
        },
        {
          "concentration": 50,
          "signals": [
            24578,
            25135
          ],
          "mean": 24856.5
        },
        {
          "concentration": 200,
          "signals": [
            94469,
            96836
          ],
          "mean": 95652.5
        },
        {
          "concentration": 800,
          "signals": [
            346333,
            354447
          ],
          "mean": 350390
        },
        {
          "concentration": 3200,
          "signals": [
            857579,
            873151
          ],
          "mean": 865365
        }
      ],
      "params": {
        "Assay": "MCP-1",
        "Spot": 9,
        "Algorithm": "FourPL",
        "Algorithm Parameter: Initial Top": 865087.725,
        "Algorithm Parameter: Initial Bottom": 104.05,
        "Algorithm Parameter: Initial MidPoint": 37.910462859126,
        "Algorithm Parameter: Initial HillSlope": 1,
        "Algorithm Parameter: Weighting": "1/y^2",
        "Algorithm Parameter: Max Iteration": 500,
        "Fit Statistic: RSquared": 0.999866669323219,
        "Algorithm Parameter: Calc. Top": 2442778.4478953,
        "Algorithm Parameter: Calc. Bottom": 117.21251452709141,
        "Algorithm Parameter: Calc. MidPoint": 215.7242424359061,
        "Algorithm Parameter: Calc. HillSlope": 1.0317589844966704,
        "Detection Limits: Calc. Low": 0.0966908830513209,
        "Detection Limits: Calc. High": 2700
      }
    },
    "TNF-α": {
      "standards": [
        {
          "concentration": 0,
          "signals": [
            220,
            220
          ],
          "mean": 220
        },
        {
          "concentration": 0.5859375,
          "signals": [
            563,
            570
          ],
          "mean": 566.5
        },
        {
          "concentration": 2.34375,
          "signals": [
            1910,
            1949
          ],
          "mean": 1929.5
        },
        {
          "concentration": 9.375,
          "signals": [
            6592,
            6756
          ],
          "mean": 6674
        },
        {
          "concentration": 37.5,
          "signals": [
            23242,
            24437
          ],
          "mean": 23839.5
        },
        {
          "concentration": 150,
          "signals": [
            85559,
            88648
          ],
          "mean": 87103.5
        },
        {
          "concentration": 600,
          "signals": [
            298972,
            307127
          ],
          "mean": 303049.5
        },
        {
          "concentration": 2400,
          "signals": [
            815941,
            836103
          ],
          "mean": 826022
        }
      ],
      "params": {
        "Assay": "TNF-α",
        "Spot": 10,
        "Algorithm": "FourPL",
        "Algorithm Parameter: Initial Top": 991610.93,
        "Algorithm Parameter: Initial Bottom": 220,
        "Algorithm Parameter: Initial MidPoint": 60.2631569991372,
        "Algorithm Parameter: Initial HillSlope": 1,
        "Algorithm Parameter: Weighting": "1/y^2",
        "Algorithm Parameter: Max Iteration": 500,
        "Fit Statistic: RSquared": 0.999932750629619,
        "Algorithm Parameter: Calc. Top": 3268788.45876593,
        "Algorithm Parameter: Calc. Bottom": 228.8879963669238,
        "Algorithm Parameter: Calc. MidPoint": 390.74972614536216,
        "Algorithm Parameter: Calc. HillSlope": 1.012092160172607,
        "Detection Limits: Calc. Low": 0.079651693313474,
        "Detection Limits: Calc. High": 1355
      }
    }
  },
  "E3_P6": {
    "GM-CSF": {
      "standards": [
        {
          "concentration": 0,
          "signals": [
            97,
            126
          ],
          "mean": 111.5
        },
        {
          "concentration": 1.1279296875,
          "signals": [
            1565,
            1539
          ],
          "mean": 1552
        },
        {
          "concentration": 4.51171875,
          "signals": [
            5608,
            5499
          ],
          "mean": 5553.5
        },
        {
          "concentration": 18.046875,
          "signals": [
            21685,
            21238
          ],
          "mean": 21461.5
        },
        {
          "concentration": 72.1875,
          "signals": [
            78210,
            75143
          ],
          "mean": 76676.5
        },
        {
          "concentration": 288.75,
          "signals": [
            268530,
            270661
          ],
          "mean": 269595.5
        },
        {
          "concentration": 1155,
          "signals": [
            1068129,
            1132297
          ],
          "mean": 1100213
        },
        {
          "concentration": 4620,
          "signals": [
            1753481,
            1805855
          ],
          "mean": 1779668
        }
      ],
      "params": {
        "Assay": "GM-CSF",
        "Spot": 1,
        "Algorithm": "FourPL",
        "Algorithm Parameter: Initial Top": 1725563.76,
        "Algorithm Parameter: Initial Bottom": 97.65,
        "Algorithm Parameter: Initial MidPoint": 850.576094685949,
        "Algorithm Parameter: Initial HillSlope": 1,
        "Algorithm Parameter: Weighting": "1/y^2",
        "Algorithm Parameter: Max Iteration": 500,
        "Fit Statistic: RSquared": 0.975435468071261,
        "Algorithm Parameter: Calc. Top": 2730863.33378444,
        "Algorithm Parameter: Calc. Bottom": 107.957608734576,
        "Algorithm Parameter: Calc. MidPoint": 2262.91919423903,
        "Algorithm Parameter: Calc. HillSlope": 1.00338440779492,
        "Detection Limits: Calc. Low": 0.0314630362631397,
        "Detection Limits: Calc. High": 4620
      }
    },
    "IFN-γ": {
      "standards": [
        {
          "concentration": 0,
          "signals": [
            585,
            577
          ],
          "mean": 581
        },
        {
          "concentration": 3.515625,
          "signals": [
            1822,
            1792
          ],
          "mean": 1807
        },
        {
          "concentration": 14.0625,
          "signals": [
            5787,
            5967
          ],
          "mean": 5877
        },
        {
          "concentration": 56.25,
          "signals": [
            20662,
            21146
          ],
          "mean": 20904
        },
        {
          "concentration": 225,
          "signals": [
            72308,
            73464
          ],
          "mean": 72886
        },
        {
          "concentration": 900,
          "signals": [
            286501,
            291072
          ],
          "mean": 288786.5
        },
        {
          "concentration": 3600,
          "signals": [
            857918,
            877755
          ],
          "mean": 867836.5
        },
        {
          "concentration": 14400,
          "signals": [
            1042532,
            1042892
          ],
          "mean": 1042712
        }
      ],
      "params": {
        "Assay": "IFN-γ",
        "Spot": 2,
        "Algorithm": "FourPL",
        "Algorithm Parameter: Initial Top": 1045016.7,
        "Algorithm Parameter: Initial Bottom": 133.2,
        "Algorithm Parameter: Initial MidPoint": 8213.97460429925,
        "Algorithm Parameter: Initial HillSlope": 1,
        "Algorithm Parameter: Weighting": "1/y^2",
        "Algorithm Parameter: Max Iteration": 500,
        "Fit Statistic: RSquared": 0.999790476224941,
        "Algorithm Parameter: Calc. Top": 605509351.493248,
        "Algorithm Parameter: Calc. Bottom": 152.89853829015604,
        "Algorithm Parameter: Calc. MidPoint": 8699635.58699664,
        "Algorithm Parameter: Calc. HillSlope": 1.014257304837268,
        "Detection Limits: Calc. Low": 0.739036673560809,
        "Detection Limits: Calc. High": 16050
      }
    },
    "IL-10": {
      "standards": [
        {
          "concentration": 0,
          "signals": [
            157,
            165
          ],
          "mean": 161
        },
        {
          "concentration": 0.9765625,
          "signals": [
            493,
            497
          ],
          "mean": 495
        },
        {
          "concentration": 3.90625,
          "signals": [
            1912,
            1924
          ],
          "mean": 1918
        },
        {
          "concentration": 15.625,
          "signals": [
            8194,
            8255
          ],
          "mean": 8224.5
        },
        {
          "concentration": 62.5,
          "signals": [
            35904,
            36065
          ],
          "mean": 35984.5
        },
        {
          "concentration": 250,
          "signals": [
            165836,
            167060
          ],
          "mean": 166448
        },
        {
          "concentration": 1000,
          "signals": [
            646374,
            658433
          ],
          "mean": 652403.5
        },
        {
          "concentration": 4000,
          "signals": [
            817933,
            833322
          ],
          "mean": 825627.5
        }
      ],
      "params": {
        "Assay": "IL-10",
        "Spot": 8,
        "Algorithm": "FourPL",
        "Algorithm Parameter: Initial Top": 848730.27,
        "Algorithm Parameter: Initial Bottom": 95.6,
        "Algorithm Parameter: Initial MidPoint": 46.2250060074453,
        "Algorithm Parameter: Initial HillSlope": 1,
        "Algorithm Parameter: Weighting": "1/y^2",
        "Algorithm Parameter: Max Iteration": 500,
        "Fit Statistic: RSquared": 0.999801730484692,
        "Algorithm Parameter: Calc. Top": 3329745.88660483,
        "Algorithm Parameter: Calc. Bottom": 102.8059736333532,
        "Algorithm Parameter: Calc. MidPoint": 622.894037230342,
        "Algorithm Parameter: Calc. HillSlope": 1.0249526114063034,
        "Detection Limits: Calc. Low": 0.0452695741442642,
        "Detection Limits: Calc. High": 2015
      }
    },
    "IL-1β": {
      "standards": [
        {
          "concentration": 0,
          "signals": [
            118,
            111
          ],
          "mean": 114.5
        },
        {
          "concentration": 0.576171875,
          "signals": [
            359,
            362
          ],
          "mean": 360.5
        },
        {
          "concentration": 2.3046875,
          "signals": [
            1520,
            1517
          ],
          "mean": 1518.5
        },
        {
          "concentration": 9.21875,
          "signals": [
            6744,
            6860
          ],
          "mean": 6802
        },
        {
          "concentration": 36.875,
          "signals": [
            27940,
            28255
          ],
          "mean": 28097.5
        },
        {
          "concentration": 147.5,
          "signals": [
            110843,
            112323
          ],
          "mean": 111583
        },
        {
          "concentration": 590,
          "signals": [
            439034,
            443250
          ],
          "mean": 441142
        },
        {
          "concentration": 2360,
          "signals": [
            885424,
            897872
          ],
          "mean": 891648
        }
      ],
      "params": {
        "Assay": "IL-1β",
        "Spot": 3,
        "Algorithm": "FourPL",
        "Algorithm Parameter: Initial Top": 1366300.225,
        "Algorithm Parameter: Initial Bottom": 94.6,
        "Algorithm Parameter: Initial MidPoint": 33.1346447715777,
        "Algorithm Parameter: Initial HillSlope": 1,
        "Algorithm Parameter: Weighting": "1/y^2",
        "Algorithm Parameter: Max Iteration": 500,
        "Fit Statistic: RSquared": 0.999939828134944,
        "Algorithm Parameter: Calc. Top": 6525270.69951376,
        "Algorithm Parameter: Calc. Bottom": 111.2270634441946,
        "Algorithm Parameter: Calc. MidPoint": 418.3469644383764,
        "Algorithm Parameter: Calc. HillSlope": 1.0772896904518217,
        "Detection Limits: Calc. Low": 0.0348790679431419,
        "Detection Limits: Calc. High": 2220
      }
    },
    "IL-2": {
      "standards": [
        {
          "concentration": 0,
          "signals": [
            99,
            107
          ],
          "mean": 103
        },
        {
          "concentration": 0.390625,
          "signals": [
            256,
            259
          ],
          "mean": 257.5
        },
        {
          "concentration": 1.5625,
          "signals": [
            866,
            868
          ],
          "mean": 867
        },
        {
          "concentration": 6.25,
          "signals": [
            3204,
            3247
          ],
          "mean": 3225.5
        },
        {
          "concentration": 25,
          "signals": [
            12084,
            12245
          ],
          "mean": 12164.5
        },
        {
          "concentration": 100,
          "signals": [
            44059,
            44830
          ],
          "mean": 44444.5
        },
        {
          "concentration": 400,
          "signals": [
            150983,
            153610
          ],
          "mean": 152296.5
        },
        {
          "concentration": 1600,
          "signals": [
            379044,
            383242
          ],
          "mean": 381143
        }
      ],
      "params": {
        "Assay": "IL-2",
        "Spot": 4,
        "Algorithm": "FourPL",
        "Algorithm Parameter: Initial Top": 224728.03,
        "Algorithm Parameter: Initial Bottom": 95.45,
        "Algorithm Parameter: Initial MidPoint": 7.45642956648987,
        "Algorithm Parameter: Initial HillSlope": 1,
        "Algorithm Parameter: Weighting": "1/y^2",
        "Algorithm Parameter: Max Iteration": 500,
        "Fit Statistic: RSquared": 0.999879310102781,
        "Algorithm Parameter: Calc. Top": 1533152.65368206,
        "Algorithm Parameter: Calc. Bottom": 103.54590999250031,
        "Algorithm Parameter: Calc. MidPoint": 42.466700105916615,
        "Algorithm Parameter: Calc. HillSlope": 1.0041570364535222,
        "Detection Limits: Calc. Low": 0.0333986176656859,
        "Detection Limits: Calc. High": 945
      }
    },
    "IL-4": {
      "standards": [
        {
          "concentration": 0,
          "signals": [
            155,
            161
          ],
          "mean": 158
        },
        {
          "concentration": 0.390625,
          "signals": [
            357,
            364
          ],
          "mean": 360.5
        },
        {
          "concentration": 1.5625,
          "signals": [
            1291,
            1290
          ],
          "mean": 1290.5
        },
        {
          "concentration": 6.25,
          "signals": [
            4832,
            4860
          ],
          "mean": 4846
        },
        {
          "concentration": 25,
          "signals": [
            18029,
            18337
          ],
          "mean": 18183
        },
        {
          "concentration": 100,
          "signals": [
            65094,
            65929
          ],
          "mean": 65511.5
        },
        {
          "concentration": 400,
          "signals": [
            223767,
            225884
          ],
          "mean": 224825.5
        },
        {
          "concentration": 1600,
          "signals": [
            618818,
            631949
          ],
          "mean": 625383.5
        }
      ],
      "params": {
        "Assay": "IL-4",
        "Spot": 5,
        "Algorithm": "FourPL",
        "Algorithm Parameter: Initial Top": 1436146.27,
        "Algorithm Parameter: Initial Bottom": 130.85,
        "Algorithm Parameter: Initial MidPoint": 36.8048394620026,
        "Algorithm Parameter: Initial HillSlope": 1,
        "Algorithm Parameter: Weighting": "1/y^2",
        "Algorithm Parameter: Max Iteration": 500,
        "Fit Statistic: RSquared": 0.999862113580362,
        "Algorithm Parameter: Calc. Top": 15287216.451964935,
        "Algorithm Parameter: Calc. Bottom": 95.903999999865,
        "Algorithm Parameter: Calc. MidPoint": 374.0194903136555,
        "Algorithm Parameter: Calc. HillSlope": 1.015489112285734,
        "Detection Limits: Calc. Low": 0.0941256228272387,
        "Detection Limits: Calc. High": 825
      }
    },
    "IL-5": {
      "standards": [
        {
          "concentration": 0,
          "signals": [
            96,
            96
          ],
          "mean": 96
        },
        {
          "concentration": 0.9765625,
          "signals": [
            359,
            342
          ],
          "mean": 350.5
        },
        {
          "concentration": 3.90625,
          "signals": [
            1425,
            1416
          ],
          "mean": 1420.5
        },
        {
          "concentration": 15.625,
          "signals": [
            5677,
            5690
          ],
          "mean": 5683.5
        },
        {
          "concentration": 62.5,
          "signals": [
            22254,
            22344
          ],
          "mean": 22299
        },
        {
          "concentration": 250,
          "signals": [
            82816,
            83810
          ],
          "mean": 83313
        },
        {
          "concentration": 1000,
          "signals": [
            271013,
            274333
          ],
          "mean": 272673
        },
        {
          "concentration": 4000,
          "signals": [
            656510,
            664062
          ],
          "mean": 660286
        }
      ],
      "params": {
        "Assay": "IL-5",
        "Spot": 6,
        "Algorithm": "FourPL",
        "Algorithm Parameter: Initial Top": 889462.56,
        "Algorithm Parameter: Initial Bottom": 88.35,
        "Algorithm Parameter: Initial MidPoint": 28.7686273888016,
        "Algorithm Parameter: Initial HillSlope": 1,
        "Algorithm Parameter: Weighting": "1/y^2",
        "Algorithm Parameter: Max Iteration": 500,
        "Fit Statistic: RSquared": 0.999816151594017,
        "Algorithm Parameter: Calc. Top": 450076.807878491,
        "Algorithm Parameter: Calc. Bottom": 93.6140802694157,
        "Algorithm Parameter: Calc. MidPoint": 59.3621508603787,
        "Algorithm Parameter: Calc. HillSlope": 1.01548505580317,
        "Detection Limits: Calc. Low": 0.0563934082712106,
        "Detection Limits: Calc. High": 2140
      }
    },
    "IL-6": {
      "standards": [
        {
          "concentration": 0,
          "signals": [
            116,
            112
          ],
          "mean": 114
        },
        {
          "concentration": 0.48828125,
          "signals": [
            380,
            386
          ],
          "mean": 383
        },
        {
          "concentration": 1.953125,
          "signals": [
            1467,
            1468
          ],
          "mean": 1467.5
        },
        {
          "concentration": 7.8125,
          "signals": [
            5795,
            5899
          ],
          "mean": 5847
        },
        {
          "concentration": 31.25,
          "signals": [
            23175,
            23815
          ],
          "mean": 23495
        },
        {
          "concentration": 125,
          "signals": [
            91406,
            93323
          ],
          "mean": 92364.5
        },
        {
          "concentration": 500,
          "signals": [
            322499,
            333474
          ],
          "mean": 327986.5
        },
        {
          "concentration": 2000,
          "signals": [
            736202,
            748666
          ],
          "mean": 742434
        }
      ],
      "params": {
        "Assay": "IL-6",
        "Spot": 7,
        "Algorithm": "FourPL",
        "Algorithm Parameter: Initial Top": 619028.495,
        "Algorithm Parameter: Initial Bottom": 105.45,
        "Algorithm Parameter: Initial MidPoint": 20.6223399786602,
        "Algorithm Parameter: Initial HillSlope": 1,
        "Algorithm Parameter: Weighting": "1/y^2",
        "Algorithm Parameter: Max Iteration": 500,
        "Fit Statistic: RSquared": 0.99979284894419,
        "Algorithm Parameter: Calc. Top": 10501625.1139692,
        "Algorithm Parameter: Calc. Bottom": 135.62855125168497,
        "Algorithm Parameter: Calc. MidPoint": 167.01820600288275,
        "Algorithm Parameter: Calc. HillSlope": 1.015650644710345,
        "Detection Limits: Calc. Low": 0.0906912843353774,
        "Detection Limits: Calc. High": 1040
      }
    },
    "MCP-1": {
      "standards": [
        {
          "concentration": 0,
          "signals": [
            105,
            102
          ],
          "mean": 103.5
        },
        {
          "concentration": 0.78125,
          "signals": [
            411,
            405
          ],
          "mean": 408
        },
        {
          "concentration": 3.125,
          "signals": [
            1623,
            1621
          ],
          "mean": 1622
        },
        {
          "concentration": 12.5,
          "signals": [
            6534,
            6582
          ],
          "mean": 6558
        },
        {
          "concentration": 50,
          "signals": [
            24969,
            25217
          ],
          "mean": 25093
        },
        {
          "concentration": 200,
          "signals": [
            95769,
            96803
          ],
          "mean": 96286
        },
        {
          "concentration": 800,
          "signals": [
            351713,
            354635
          ],
          "mean": 353174
        },
        {
          "concentration": 3200,
          "signals": [
            870931,
            891528
          ],
          "mean": 881229.5
        }
      ],
      "params": {
        "Assay": "MCP-1",
        "Spot": 9,
        "Algorithm": "FourPL",
        "Algorithm Parameter: Initial Top": 931229.595,
        "Algorithm Parameter: Initial Bottom": 130.05,
        "Algorithm Parameter: Initial MidPoint": 39.5537068000199,
        "Algorithm Parameter: Initial HillSlope": 1,
        "Algorithm Parameter: Weighting": "1/y^2",
        "Algorithm Parameter: Max Iteration": 500,
        "Fit Statistic: RSquared": 0.994486016997739,
        "Algorithm Parameter: Calc. Top": 1597546.63304996,
        "Algorithm Parameter: Calc. Bottom": 152.334307965828,
        "Algorithm Parameter: Calc. MidPoint": 1852.51508768742,
        "Algorithm Parameter: Calc. HillSlope": 1.11732775532563,
        "Detection Limits: Calc. Low": 0.372864648461688,
        "Detection Limits: Calc. High": 2700
      }
    },
    "TNF-α": {
      "standards": [
        {
          "concentration": 0,
          "signals": [
            208,
            205
          ],
          "mean": 206.5
        },
        {
          "concentration": 0.5859375,
          "signals": [
            552,
            557
          ],
          "mean": 554.5
        },
        {
          "concentration": 2.34375,
          "signals": [
            1899,
            1908
          ],
          "mean": 1903.5
        },
        {
          "concentration": 9.375,
          "signals": [
            6533,
            6656
          ],
          "mean": 6594.5
        },
        {
          "concentration": 37.5,
          "signals": [
            23646,
            24301
          ],
          "mean": 23973.5
        },
        {
          "concentration": 150,
          "signals": [
            87139,
            88998
          ],
          "mean": 88068.5
        },
        {
          "concentration": 600,
          "signals": [
            307336,
            312078
          ],
          "mean": 309707
        },
        {
          "concentration": 2400,
          "signals": [
            849507,
            867563
          ],
          "mean": 858535
        }
      ],
      "params": {
        "Assay": "TNF-α",
        "Spot": 10,
        "Algorithm": "FourPL",
        "Algorithm Parameter: Initial Top": 998975.85,
        "Algorithm Parameter: Initial Bottom": 198,
        "Algorithm Parameter: Initial MidPoint": 62.9192521811342,
        "Algorithm Parameter: Initial HillSlope": 1,
        "Algorithm Parameter: Weighting": "1/y^2",
        "Algorithm Parameter: Max Iteration": 500,
        "Fit Statistic: RSquared": 0.999999260668305,
        "Algorithm Parameter: Calc. Top": 6002699.0947738,
        "Algorithm Parameter: Calc. Bottom": 220.889617977528,
        "Algorithm Parameter: Calc. MidPoint": 6743.00971050925,
        "Algorithm Parameter: Calc. HillSlope": 1.01112426617827,
        "Detection Limits: Calc. Low": 0.090048157348597,
        "Detection Limits: Calc. High": 1355
      }
    }
  }
};

