// Explicitly size both axes. Grid tracks must not depend on the intrinsic
// height of absolutely positioned thumbnail contents or button defaults.
export const galleryDensities=Object.freeze({dense:{min:70,gap:3},normal:{min:104,gap:6},spacious:{min:156,gap:9}});
export function galleryLayout(clientWidth,density='normal'){
 const {min,gap}=galleryDensities[density]||galleryDensities.normal;
 const available=Math.max(0,Math.floor(clientWidth)-2*gap);
 const columns=Math.max(1,Math.floor((available+gap)/(min+gap)));
 const size=Math.max(0,Math.floor((available-gap*(columns-1))/columns*100)/100);
 return {columns,size,gap};
}
