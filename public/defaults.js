// Shared between the browser (window.KK_DEFAULTS) and the Node server (require).
(function (root) {
  const DEFAULTS = {
    societies: [
      {
        id: 'vaishnavi-gardenia',
        name: 'Vaishnavi Gardenia',
        blocks: ['A', 'B', 'C', 'D', 'E'],
        floors: 18,
        unitsPerFloor: 8,
      },
      { id: 'pratham', name: 'Pratham', blocks: [], floors: 0, unitsPerFloor: 0 },
      { id: 'pgl-apartments', name: 'PGL Apartments', blocks: [], floors: 0, unitsPerFloor: 0 },
    ],
    menu: [],
    orders: [],
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = DEFAULTS;
  else root.KK_DEFAULTS = DEFAULTS;
})(this);
