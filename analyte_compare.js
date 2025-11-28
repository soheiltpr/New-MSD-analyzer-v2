const EPS = 1e-12;

function invert4PL({ A, B, C, D }, signal) {
  const y = Math.min(Math.max(signal, D + EPS), A - EPS);
  const ratio = (A - D) / (y - D) - 1;
  return C * Math.pow(Math.max(ratio, EPS), -1 / B);
}

function forward4PL({ A, B, C, D }, concentration) {
  const x = Math.max(concentration, EPS);
  const term = Math.pow(C / x, B);
  return D + (A - D) / (1 + term);
}

function percentDiff(actual, expected) {
  if (expected === 0) return actual === 0 ? 0 : Infinity;
  return ((actual - expected) / expected) * 100;
}

const analytes = [
  {
    name: 'IL-10',
    params: { A: 1_722_572.07, D: 112.30, C: 1_879.85, B: 0.9842 },
    standards: [
      { signal: 120, concentration: 0.0068923610540238 },
      { signal: 635, concentration: 0.5010222365409058 },
      { signal: 648, concentration: 0.5136897473045035 },
      { signal: 2_069, concentration: 1.9173681460064824 },
      { signal: 2_039, concentration: 1.8874692494825995 },
      { signal: 7_924, concentration: 7.8539417119762645 },
      { signal: 8_153, concentration: 8.08903016259676 },
      { signal: 30_565, concentration: 31.719300306088225 },
      { signal: 29_476, concentration: 30.547146885828 },
      { signal: 113_116, concentration: 126.4761157120714 },
      { signal: 115_140, concentration: 128.94288789473455 },
      { signal: 375_135, concentration: 512.5669390242168 },
      { signal: 364_214, concentration: 493.3413538470772 },
      { signal: 878_108, concentration: 1_955.7139470934712 },
      { signal: 902_107, concentration: 2_069.7943899372617 },
    ],
    unknownSignals: [46_405, 49_616, 67_575, 437, 362, 305],
    expectedUnknowns: [
      49.0096998417143,
      52.56795815814693,
      72.78950296579777,
      0.3088257866243305,
      0.23648160710013091,
      0.18173428991372734,
    ],
  },
  {
    name: 'IL-1β',
    params: { A: 4_297_377.31, D: 183.07, C: 4_882.57, B: 0.9792 },
    standards: [
      { signal: 199, concentration: 0.013865376956710107 },
      { signal: 787, concentration: 0.5681818932035099 },
      { signal: 781, concentration: 0.5624166276551955 },
      { signal: 2_430, concentration: 2.174761186062474 },
      { signal: 2_379, concentration: 2.124334638950839 },
      { signal: 8_732, concentration: 8.525935898096185 },
      { signal: 8_405, concentration: 8.192370822245014 },
      { signal: 34_437, concentration: 35.40318288216058 },
      { signal: 33_837, concentration: 34.76496970389367 },
      { signal: 128_211, concentration: 139.21762993176853 },
      { signal: 126_988, concentration: 137.8182721381746 },
      { signal: 471_110, concentration: 574.7177069901498 },
      { signal: 459_182, concentration: 558.0780527825768 },
      { signal: 1_392_601, concentration: 2_304.124434281638 },
      { signal: 1_309_204, concentration: 2_101.6333543469636 },
    ],
    unknownSignals: [156_179, 149_314, 154_044, 730],
    expectedUnknowns: [
      171.52020119204143,
      163.53808243526497,
      169.03409809438888,
      0.5134635320593182,
    ],
  },
  {
    name: 'IL-2',
    params: { A: 86_808_757.36, D: 148.68, C: 327_051.16, B: 1.0119 },
    standards: [
      { signal: 174, concentration: 0.11383375190035766 },
      { signal: 183, concentration: 0.15374005321055534 },
      { signal: 200, concentration: 0.2288018274915944 },
      { signal: 360, concentration: 0.9265658716136693 },
      { signal: 369, concentration: 0.9655544772426252 },
      { signal: 999, concentration: 3.6679207102579907 },
      { signal: 1_047, concentration: 3.872477372254918 },
      { signal: 3_660, concentration: 14.8967792993029 },
      { signal: 3_675, concentration: 14.959670965193652 },
      { signal: 14_047, concentration: 58.02617493409215 },
      { signal: 13_776, concentration: 56.90770943772515 },
      { signal: 58_124, concentration: 238.14636611512512 },
      { signal: 57_105, concentration: 234.00657271512495 },
      { signal: 231_453, concentration: 936.6797371209212 },
      { signal: 239_385, concentration: 968.5052608755103 },
    ],
    unknownSignals: [269, 284, 268],
    expectedUnknowns: [
      0.5310672315710199,
      0.596449147342458,
      0.5267051605867147,
    ],
  },
  {
    name: 'IL-4',
    params: { A: 3_451_522.15, D: 92.67, C: 1_137.36, B: 1.0007 },
    standards: [
      { signal: 96, concentration: 0.0011092677829901332 },
      { signal: 787, concentration: 0.23025442570833263 },
      { signal: 734, concentration: 0.212687445423989 },
      { signal: 2_447, concentration: 0.7804340036849011 },
      { signal: 2_327, concentration: 0.7406574686001308 },
      { signal: 9_827, concentration: 3.230438564045819 },
      { signal: 9_557, concentration: 3.1406535144024157 },
      { signal: 38_279, concentration: 12.765552445536015 },
      { signal: 36_754, concentration: 12.250639603833733 },
      { signal: 149_440, concentration: 51.55524865969283 },
      { signal: 149_013, concentration: 51.401310323648474 },
      { signal: 571_725, concentration: 226.02525123002476 },
      { signal: 558_238, concentration: 219.6681967107065 },
      { signal: 1_386_830, concentration: 764.1187668625813 },
      { signal: 1_458_066, concentration: 832.0286658833529 },
    ],
    unknownSignals: [257, 231, 249],
    expectedUnknowns: [
      0.05454405398175255,
      0.045919674164808,
      0.0518904970424415,
    ],
  },
  {
    name: 'IL-5',
    params: { A: 5_371_094.25, D: 161.44, C: 10_834.29, B: 0.98899 },
    standards: [
      { signal: 167, concentration: 0.009623418321496557 },
      { signal: 472, concentration: 0.5619952135166408 },
      { signal: 472, concentration: 0.5619952135166408 },
      { signal: 1_316, concentration: 2.1204156053498484 },
      { signal: 1_230, concentration: 1.9607493033661072 },
      { signal: 4_678, concentration: 8.427202137321403 },
      { signal: 4_438, concentration: 7.974188665964462 },
      { signal: 18_326, concentration: 34.51033474830226 },
      { signal: 16_898, concentration: 31.75977293937905 },
      { signal: 70_241, concentration: 136.49758904398342 },
      { signal: 67_645, concentration: 131.3209588161342 },
      { signal: 273_830, concentration: 563.0471499834456 },
      { signal: 260_769, concentration: 534.4986354164763 },
      { signal: 916_569, concentration: 2_189.983125159731 },
      { signal: 870_606, concentration: 2_057.48422564288 },
    ],
    unknownSignals: [262, 261, 295],
    expectedUnknowns: [
      0.1796997397248227,
      0.17789295116715167,
      0.23942622872143507,
    ],
  },
  {
    name: 'IL-6',
    params: { A: 293_304_190.04, D: 127.51, C: 422_500.68, B: 1.0398 },
    standards: [
      { signal: 239, concentration: 0.28270078305925855 },
      { signal: 257, concentration: 0.32646856077223857 },
      { signal: 553, concentration: 1.025022738433489 },
      { signal: 612, concentration: 1.1613733943418547 },
      { signal: 1_832, concentration: 3.8939109431574006 },
      { signal: 1_850, concentration: 3.9334512871127982 },
      { signal: 7_349, concentration: 15.611361254096357 },
      { signal: 7_109, concentration: 15.112044867907237 },
      { signal: 30_599, concentration: 62.34802776005448 },
      { signal: 30_087, concentration: 61.34006434386357 },
      { signal: 142_686, concentration: 275.07349843682925 },
      { signal: 134_401, concentration: 259.6742059590861 },
      { signal: 597_631, concentration: 1_093.0458969568533 },
      { signal: 600_164, concentration: 1_097.511173014355 },
    ],
    unknownSignals: [1_086_775, 1_134_566, 1_245_147],
    expectedUnknowns: [
      1_946.0283575242302,
      2_028.592074290258,
      2_219.232558331001,
    ],
  },
  {
    name: 'MCP-1',
    params: { A: 1_597_546.63, D: 152.33, C: 1_852.52, B: 1.1173 },
    standards: [
      { signal: 178, concentration: 0.09486870011804019 },
      { signal: 420, concentration: 0.773567743018178 },
      { signal: 499, concentration: 0.9750826721939657 },
      { signal: 1_239, concentration: 2.71208513202607 },
      { signal: 1_189, concentration: 2.6000523029988747 },
      { signal: 4_670, concentration: 9.726956668777055 },
      { signal: 4_625, concentration: 9.639952337187884 },
      { signal: 21_550, concentration: 39.50412600058896 },
      { signal: 20_053, concentration: 36.989823103474784 },
      { signal: 112_796, concentration: 184.25457063642423 },
      { signal: 110_921, concentration: 181.30232268105377 },
      { signal: 454_545, concentration: 811.3607856072726 },
      { signal: 437_231, concentration: 773.1616538948895 },
      { signal: 916_556, concentration: 2_416.3904894798534 },
      { signal: 927_463, concentration: 2_477.6603880852167 },
    ],
    unknownSignals: [525_500, 581_158, 642_994],
    expectedUnknowns: [
      978.4144391519447,
      1_123.0176499409608,
      1_300.4549563916878,
    ],
  },
  {
    name: 'TNF-α',
    params: { A: 6_002_699.09, D: 220.89, C: 6_743.01, B: 1.0111 },
    standards: [
      { signal: 240, concentration: 0.024675878138710233 },
      { signal: 492, concentration: 0.34001218651066684 },
      { signal: 491, concentration: 0.3387717569342539 },
      { signal: 1_354, concentration: 1.3990995278146479 },
      { signal: 1_191, concentration: 1.1998528152737717 },
      { signal: 4_657, concentration: 5.3987594391127915 },
      { signal: 4_579, concentration: 5.304800226712572 },
      { signal: 18_170, concentration: 21.55880314978126 },
      { signal: 17_121, concentration: 20.308774540966706 },
      { signal: 71_400, concentration: 84.95503782035209 },
      { signal: 71_792, concentration: 85.42332712570372 },
      { signal: 285_538, concentration: 347.7956624535935 },
      { signal: 272_065, concentration: 330.77783379179016 },
      { signal: 969_965, concentration: 1_323.0461697202345 },
      { signal: 1_008_205, concentration: 1_385.041469310055 },
    ],
    unknownSignals: [387_403, 404_880, 449_257],
    expectedUnknowns: [
      478.8227384913677,
      501.73773023204217,
      560.518673274089,
    ],
  },
  {
    name: 'GM-CSF',
    params: { A: 2_872_984.58, D: 111.87, C: 2_272.19, B: 1.0061 },
    standards: [
      { signal: 126, concentration: 0.01203813857969287 },
      { signal: 1_565, concentration: 1.2042506466457086 },
      { signal: 1_539, concentration: 1.182823037760732 },
      { signal: 5_608, concentration: 4.52439622213783 },
      { signal: 5_499, concentration: 4.435041017965255 },
      { signal: 21_685, concentration: 17.71041122340166 },
      { signal: 21_238, concentration: 17.342956079961763 },
      { signal: 84_356, concentration: 70.12080860365408 },
      { signal: 81_394, concentration: 67.59875991373451 },
      { signal: 316_293, concentration: 284.5962747118702 },
      { signal: 303_440, concentration: 271.73846260389814 },
      { signal: 1_187_641, concentration: 1_604.4528406959107 },
      { signal: 1_120_800, concentration: 1_457.2432337110438 },
      { signal: 1_783_080, concentration: 3_705.948328213423 },
      { signal: 1_866_816, concentration: 4_199.6809950195575 },
    ],
    unknownSignals: [20_602, 22_380, 23_692, 153, 118, 151],
    expectedUnknowns: [
      16.82025009144614,
      18.28187053409114,
      19.36111819255403,
      0.03481560885143149,
      0.005248641075961603,
      0.03313264598180057,
    ],
  },
  {
    name: 'IFN-γ',
    params: { A: 781_670_046.11, D: 152.46, C: 11_018_082.46, B: 1.0204 },
    standards: [
      { signal: 391, concentration: 4.540201028001934 },
      { signal: 365, concentration: 4.05468575584368 },
      { signal: 1_048, concentration: 16.59975979829821 },
      { signal: 1_000, concentration: 15.727361478246992 },
      { signal: 3_607, concentration: 62.32639345964036 },
      { signal: 3_399, concentration: 58.64652829521947 },
      { signal: 14_542, concentration: 252.3072098001933 },
      { signal: 14_201, concentration: 246.44628338758721 },
      { signal: 56_429, concentration: 960.2311595802246 },
      { signal: 54_196, concentration: 922.8752416146948 },
      { signal: 245_673, concentration: 4_068.474148283986 },
      { signal: 247_265, concentration: 4_094.3332459250128 },
      { signal: 1_051_645, concentration: 16_941.129871081048 },
      { signal: 1_035_564, concentration: 16_686.851637812222 },
    ],
    unknownSignals: [47_424, 106_929, 119_108, 278, 207, 261],
    expectedUnknowns: [
      809.3927072484886,
      1_798.8018997596793,
      1_999.6763192651912,
      2.420313733566596,
      1.0691495873489503,
      2.098662861019009,
    ],
  },
];

function analyze() {
  analytes.forEach(analyte => {
    console.log(`\n=== ${analyte.name} ===`);
    const params = analyte.params;

    const standardDiffs = analyte.standards.map(({ signal, concentration }) => {
      const calcConc = invert4PL(params, signal);
      return {
        signal,
        expected: concentration,
        calculated: calcConc,
        percentDifference: percentDiff(calcConc, concentration),
      };
    });

    console.log('Standards (signal → concentration):');
    console.table(
      standardDiffs.map(item => ({
        Signal: item.signal,
        'Expected Conc': item.expected,
        'Calculated Conc': item.calculated,
        '% Diff': item.percentDifference,
      }))
    );

    const unknownDiffs = analyte.unknownSignals.map((signal, idx) => {
      const expected = analyte.expectedUnknowns[idx];
      const calculated = invert4PL(params, signal);
      return {
        Signal: signal,
        'Expected Conc': expected,
        'Calculated Conc': calculated,
        '% Diff': percentDiff(calculated, expected),
      };
    });

    console.log('Unknowns:');
    console.table(unknownDiffs);

    const meanDiff =
      unknownDiffs.reduce((sum, row) => sum + Math.abs(row['% Diff']), 0) /
      (unknownDiffs.length || 1);
    const maxDiff = Math.max(
      ...unknownDiffs.map(row => Math.abs(row['% Diff']))
    );

    console.log(
      `Summary: Mean |% Diff| = ${meanDiff.toFixed(3)}%, Max |% Diff| = ${maxDiff.toFixed(
        3
      )}%`
    );
  });
}

analyze();














