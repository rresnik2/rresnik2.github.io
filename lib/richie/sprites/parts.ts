import { grid } from "./grid.ts";

// Shared head parts, stamped onto bodies so his face is drawn exactly once per
// view. Markings follow Richie: black ears with pink insides, black cap and eye
// patches, a white blaze up the middle, pink nose, yellow-green eyes.

// Facing the visitor
export const HEAD_FRONT = grid`
  ..K.........K..
  .KPK.......KPK.
  .KPPK.....KPPK.
  .KPPKKKWKKKPPK.
  .KKKKKKWKKKKKK.
  KKKKKKKWKKKKKKK
  KKEEWKWWWKEEWKK
  KKEIEKWWWKEIEKK
  KKeIeKWWWKeIeKK
  KKKKKWPPPWKKKKK
  .KKWWWWPWWWWKK.
  ..WWWWwWwWWWW..
  ...WWWWWWWWW...
`;

// Facing right (east); mirrored for west
export const HEAD_SIDE = grid`
  ..K.....K....
  .KPK...KPK...
  .KKKKKKKKK...
  KKKKKKKKKKK..
  KKKKKKKEWKKW.
  KKKKKKKEIKWWW
  KKKKKKKeIKWWP
  KKKKKKKKKWWWW
  .KKKKKKWWWWW.
  ..KKKKWWWWW..
  ...KWWWWWW...
`;

// Facing right with the ears laid back, for running
export const HEAD_SIDE_EARS_BACK = grid`
  .............
  KKKK...KKK...
  .KPPK...KPK..
  ..KKKKKKKKK..
  KKKKKKKKKKK..
  KKKKKKKEWKKW.
  KKKKKKKEIKWWW
  KKKKKKKeIKWWP
  KKKKKKKKKWWWW
  .KKKKKKWWWWW.
  ..KKKKWWWWW..
  ...KWWWWWW...
`;

// Facing away (north), smaller and further off behind his rump: the back of
// his head is all black, with a sheen on the ears
export const HEAD_BACK_SMALL = grid`
  .K.......K.
  KKK.....KKK
  KKkK...KkKK
  KKKKkkkKKKK
  KKKKKKKKKKK
  KKKKKKKKKKK
  .KKKKKKKKK.
  ..KKKKKKK..
`;

// Three-quarter back view, turned away and to the right (north-east): mostly
// the black back of his head, with the edge of his white right cheek showing;
// mirrored for north-west
export const HEAD_BACK_THREE_QUARTER = grid`
  ..K........K..
  .KKK.....KKK..
  .KKkK...KkKK..
  .KKKKkkkKKKKK.
  .KKKKKKKKKKKK.
  KKKKKKKKKKKKKK
  KKKKKKKKKKKKKW
  KKKKKKKKKKKKWW
  .KKKKKKKKKKWW.
  ..KKKKKKKKWW..
  ...KKKKKKKK...
`;

// Three-quarter view, turned toward the visitor and to the right (south-east);
// mirrored for south-west
export const HEAD_THREE_QUARTER = grid`
  .K........K...
  .KPK.....KPK..
  .KPPK...KPPK..
  .KKKKKKWKKKKK.
  KKKKKKKWKKKKKK
  KKKKKKWWWKKKKK
  KKEEWKWWWKEWKK
  KKEIEKWWWKEIKK
  KKeIeKWWWKeIKK
  KKKKKWWPPPWKKK
  .KKWWWWWPWWWK.
  ..WWWWWwWwWW..
  ...WWWWWWWW...
`;

// Overlays for the side heads (HEAD_SIDE at its x, y + 0; HEAD_SIDE_EARS_BACK
// at y + 1), stamped over the eye at (x + 7, y + 4): narrowed in a glare, or
// shut (stretching)
export const EYE_SIDE_GLARE = grid`
  KK
  EI
  eI
`;

export const EYE_SIDE_CLOSED = grid`
  KK
  KK
  kk
`;

// A yawn, stamped at (x + 10, y + 8) on HEAD_SIDE
export const MOUTH_SIDE_OPEN = grid`
  MM
  M.
`;

// Every head part by name, for previews
export const HEAD_PARTS = {
  HEAD_FRONT,
  HEAD_SIDE,
  HEAD_SIDE_EARS_BACK,
  HEAD_BACK_SMALL,
  HEAD_BACK_THREE_QUARTER,
  HEAD_THREE_QUARTER,
};
