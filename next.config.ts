import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost", "*.localhost"],
  serverExternalPackages: ["undici"],
  async redirects() {
    return [
      // ========== Category Redirects (88) ==========
      {
        source: '/category/welding-protection',
        destination: '/category/welding-protective-clothing',
        permanent: true,
      },
      {
        source: '/category/platform-trucks',
        destination: '/category/work-platforms',
        permanent: true,
      },
      {
        source: '/category/quick-coupler',
        destination: '/category/hose-hose-fittings-and-hose-reels',
        permanent: true,
      },
      {
        source: '/category/hand-truck-accessories-replacement-parts',
        destination: '/category/power-tool-replacement-parts',
        permanent: true,
      },
      {
        source: '/category/rolling-tool-cart',
        destination: '/category/tool-storage',
        permanent: true,
      },
      {
        source: '/category/metal-workbenches',
        destination: '/category/tool-storage',
        permanent: true,
      },
      {
        source: '/category/temperature-controlled-packaging',
        destination: '/category/protective-packaging',
        permanent: true,
      },
      {
        source: '/category/general-purpose-boots',
        destination: '/category/footwear-and-footwear-accessories',
        permanent: true,
      },
      {
        source: '/category/cable-tag-wire-marker',
        destination: '/category/signs-and-facility-identification-products',
        permanent: true,
      },
      {
        source: '/category/cryogenic-gloves',
        destination: '/category/safety-gloves',
        permanent: true,
      },
      {
        source: '/category/fire-extinguishers',
        destination: '/category/fire-protection',
        permanent: true,
      },
      {
        source: '/category/gears-gear-drives',
        destination: '/category/gearing',
        permanent: true,
      },
      {
        source: '/category/air-hose-connector',
        destination: '/category/hose-hose-fittings-and-hose-reels',
        permanent: true,
      },
      {
        source: '/category/snakebite-protective-gaiters',
        destination: '/category/protective-clothing',
        permanent: true,
      },
      {
        source: '/category/brooms',
        destination: '/category/cleaning-carts',
        permanent: true,
      },
      {
        source: '/category/label-dispenser',
        destination: '/category/signs-and-facility-identification-products',
        permanent: true,
      },
      {
        source: '/category/tire-sealants',
        destination: '/category/valve-sealants',
        permanent: true,
      },
      {
        source: '/category/lab-workbenches',
        destination: '/category/lab-tables',
        permanent: true,
      },
      {
        source: '/category/safety-padlock',
        destination: '/category/lockout-padlocks',
        permanent: true,
      },
      {
        source: '/category/adhesives-glues',
        destination: '/category/construction-adhesives',
        permanent: true,
      },
      {
        source: '/category/cut-resistant-gloves',
        destination: '/category/safety-gloves',
        permanent: true,
      },
      {
        source: '/category/wire-clip-mount',
        destination: '/category/cable-organizers',
        permanent: true,
      },
      {
        source: '/category/hvac-filter-panel',
        destination: '/category/bag-air-filters',
        permanent: true,
      },
      {
        source: '/category/hepa-filter-pad',
        destination: '/category/bag-air-filters',
        permanent: true,
      },
      {
        source: '/category/hoists-cranes',
        destination: '/category/lifting-magnets',
        permanent: true,
      },
      {
        source: '/category/hot-melt-applicator-guns',
        destination: '/category/hot-melt-adhesives',
        permanent: true,
      },
      {
        source: '/category/mechanical-seals',
        destination: '/category/security-seals',
        permanent: true,
      },
      {
        source: '/category/tool-storage-workbenches',
        destination: '/category/tool-storage',
        permanent: true,
      },
      {
        source: '/category/bulk-webbing',
        destination: '/category/lifting-slings',
        permanent: true,
      },
      {
        source: '/category/hand-arm-protection',
        destination: '/category/hand-and-arm-protection',
        permanent: true,
      },
      {
        source: '/category/air-purifier-cartridge',
        destination: '/category/compressed-air-filters',
        permanent: true,
      },
      {
        source: '/category/slings-rigging',
        destination: '/category/lifting-slings',
        permanent: true,
      },
      {
        source: '/category/hard-hats-and-helmets',
        destination: '/category/head-protection',
        permanent: true,
      },
      {
        source: '/category/corrosion-inhibiting-vci-packaging',
        destination: '/category/protective-packaging',
        permanent: true,
      },
      {
        source: '/category/packaging-shipping',
        destination: '/category/packing-and-shipping-bags',
        permanent: true,
      },
      {
        source: '/category/lockout-hasp',
        destination: '/category/lockout-hasps',
        permanent: true,
      },
      {
        source: '/category/flashlights',
        destination: '/category/floodlights',
        permanent: true,
      },
      {
        source: '/category/cold-condition-insulated-gloves',
        destination: '/category/safety-gloves',
        permanent: true,
      },
      {
        source: '/category/waders',
        destination: '/category/footwear-and-footwear-accessories',
        permanent: true,
      },
      {
        source: '/category/barcode-label-roll',
        destination: '/category/signs-and-facility-identification-products',
        permanent: true,
      },
      {
        source: '/category/transporting',
        destination: '/category/strapping',
        permanent: true,
      },
      {
        source: '/category/caster-wheels',
        destination: '/category/stem-casters',
        permanent: true,
      },
      {
        source: '/category/moisture-absorbent-packaging',
        destination: '/category/protective-packaging',
        permanent: true,
      },
      {
        source: '/category/inspection-gloves',
        destination: '/category/safety-gloves',
        permanent: true,
      },
      {
        source: '/category/foot-protection',
        destination: '/category/footwear-and-footwear-accessories',
        permanent: true,
      },
      {
        source: '/category/adhesives-glue',
        destination: '/category/construction-adhesives',
        permanent: true,
      },
      {
        source: '/category/labels-identification-supplies',
        destination: '/category/signs-and-facility-identification-products',
        permanent: true,
      },
      {
        source: '/category/standard-packing-tape',
        destination: '/category/packing-tape',
        permanent: true,
      },
      {
        source: '/category/trash-recycling-containers',
        destination: '/category/safety-storage',
        permanent: true,
      },
      {
        source: '/category/lifting-pulling-positioning',
        destination: '/category/lifting-slings',
        permanent: true,
      },
      {
        source: '/category/belts-pulleys',
        destination: '/category/gearing',
        permanent: true,
      },
      {
        source: '/category/general-purpose-glues',
        destination: '/category/construction-adhesives',
        permanent: true,
      },
      {
        source: '/category/modular-tool-case',
        destination: '/category/modular-tool-storage-systems',
        permanent: true,
      },
      {
        source: '/category/workbenches-shop-desks',
        destination: '/category/tool-storage',
        permanent: true,
      },
      {
        source: '/category/gaskets',
        destination: '/category/caulks-and-sealants',
        permanent: true,
      },
      {
        source: '/category/jacks-lifts',
        destination: '/category/personnel-lifts',
        permanent: true,
      },
      {
        source: '/category/direct-thermal-labels',
        destination: '/category/signs-and-facility-identification-products',
        permanent: true,
      },
      {
        source: '/category/plastic-films-rolls',
        destination: '/category/stretch-wrap-rolls',
        permanent: true,
      },
      {
        source: '/category/black-masking-tape',
        destination: '/category/packing-tape',
        permanent: true,
      },
      {
        source: '/category/cleaning-rags',
        destination: '/category/cleaning-buckets',
        permanent: true,
      },
      {
        source: '/category/blue-masking-tape',
        destination: '/category/packing-tape',
        permanent: true,
      },
      {
        source: '/category/label-holder-plastic-pouch',
        destination: '/category/signs-and-facility-identification-products',
        permanent: true,
      },
      {
        source: '/category/drainage-mats',
        destination: '/category/floor-mats',
        permanent: true,
      },
      {
        source: '/category/chain-slings',
        destination: '/category/lifting-slings',
        permanent: true,
      },
      {
        source: '/category/first-aid-medical',
        destination: '/category/first-aid-and-wound-care',
        permanent: true,
      },
      {
        source: '/category/traction-floor-mats',
        destination: '/category/floor-mats',
        permanent: true,
      },
      {
        source: '/category/lab-brushes',
        destination: '/category/lab-tables',
        permanent: true,
      },
      {
        source: '/category/polyurethane-caulks-sealants',
        destination: '/category/caulks-and-sealants',
        permanent: true,
      },
      {
        source: '/category/welding-aprons',
        destination: '/category/welding-protective-clothing',
        permanent: true,
      },
      {
        source: '/category/parts-bin-drawer-organizer',
        destination: '/category/tool-organizers',
        permanent: true,
      },
      {
        source: '/category/lockout-tagout-kits',
        destination: '/category/lockout-tagout',
        permanent: true,
      },
      {
        source: '/category/circuit-breaker-lockout',
        destination: '/category/electrical-lockout-devices',
        permanent: true,
      },
      {
        source: '/category/seals-gaskets',
        destination: '/category/caulks-and-sealants',
        permanent: true,
      },
      {
        source: '/category/carts-trucks',
        destination: '/category/stem-casters',
        permanent: true,
      },
      {
        source: '/category/nylon-cable-tie',
        destination: '/category/cable-organizers',
        permanent: true,
      },
      {
        source: '/category/plug-lockout',
        destination: '/category/valve-lockout-devices',
        permanent: true,
      },
      {
        source: '/category/pipe-thread-sealants',
        destination: '/category/pipe-sealants',
        permanent: true,
      },
      {
        source: '/category/sealing-foam-tape',
        destination: '/category/bag-sealing-tape',
        permanent: true,
      },
      {
        source: '/category/welding-gloves',
        destination: '/category/welding-protective-clothing',
        permanent: true,
      },
      {
        source: '/category/heat-shrink-tubing',
        destination: '/category/cable-organizers',
        permanent: true,
      },
      {
        source: '/category/floor-marking-tape',
        destination: '/category/antislip-tape',
        permanent: true,
      },
      {
        source: '/category/high-visibility-vests',
        destination: '/category/workwear',
        permanent: true,
      },
      {
        source: '/category/plumbing-pumps',
        destination: '/category/plumbing-valves',
        permanent: true,
      },
      {
        source: '/category/general-purpose-safety-goggles',
        destination: '/category/eyewash-equipment-and-safety-showers',
        permanent: true,
      },
      {
        source: '/category/first-aid-kits',
        destination: '/category/first-aid-and-wound-care',
        permanent: true,
      },
      {
        source: '/category/replacement-parts-for-jobsite-lights',
        destination: '/category/floodlights',
        permanent: true,
      },
      {
        source: '/category/task-jobsite-lighting',
        destination: '/category/floodlights',
        permanent: true,
      },
      {
        source: '/category/linen-carts',
        destination: '/category/cleaning-carts',
        permanent: true,
      },

      // ========== Product Redirects (720 products via wildcard) ==========
      {
        source: '/product/accessories-for-casters-wheels/:slug*',
        destination: '/category/stem-casters',
        permanent: true,
      },
      {
        source: '/product/activated-carbon-filter/:slug*',
        destination: '/category/compressed-air-filters',
        permanent: true,
      },
      {
        source: '/product/adhesive-warning-label/:slug*',
        destination: '/category/signs-and-facility-identification-products',
        permanent: true,
      },
      {
        source: '/product/adhesives-glue/:slug*',
        destination: '/category/construction-adhesives',
        permanent: true,
      },
      {
        source: '/product/air-filters/:slug*',
        destination: '/category/bag-air-filters',
        permanent: true,
      },
      {
        source: '/product/air-filtration-purification/:slug*',
        destination: '/category/compressed-air-filters',
        permanent: true,
      },
      {
        source: '/product/air-purifier-cartridge/:slug*',
        destination: '/category/compressed-air-filters',
        permanent: true,
      },
      {
        source: '/product/anti-static-packaging/:slug*',
        destination: '/category/protective-packaging',
        permanent: true,
      },
      {
        source: '/product/bag-air-filters/:slug*',
        destination: '/category/bag-air-filters',
        permanent: true,
      },
      {
        source: '/product/barcode-label-roll/:slug*',
        destination: '/category/signs-and-facility-identification-products',
        permanent: true,
      },
      {
        source: '/product/bearings/:slug*',
        destination: '/category/bearings',
        permanent: true,
      },
      {
        source: '/product/brooms/:slug*',
        destination: '/category/cleaning-carts',
        permanent: true,
      },
      {
        source: '/product/cable-tag-wire-marker/:slug*',
        destination: '/category/signs-and-facility-identification-products',
        permanent: true,
      },
      {
        source: '/product/cable-ties-wire-accessories/:slug*',
        destination: '/category/cable-organizers',
        permanent: true,
      },
      {
        source: '/product/carts-trucks/:slug*',
        destination: '/category/stem-casters',
        permanent: true,
      },
      {
        source: '/product/caster-wheels/:slug*',
        destination: '/category/stem-casters',
        permanent: true,
      },
      {
        source: '/product/casters-wheels/:slug*',
        destination: '/category/stem-casters',
        permanent: true,
      },
      {
        source: '/product/cleaning-janitorial/:slug*',
        destination: '/category/cleaning-carts',
        permanent: true,
      },
      {
        source: '/product/cleaning-supplies/:slug*',
        destination: '/category/cleaning-carts',
        permanent: true,
      },
      {
        source: '/product/cold-condition-insulated-gloves/:slug*',
        destination: '/category/safety-gloves',
        permanent: true,
      },
      {
        source: '/product/corrosion-inhibiting-vci-packaging/:slug*',
        destination: '/category/protective-packaging',
        permanent: true,
      },
      {
        source: '/product/direct-thermal-labels/:slug*',
        destination: '/category/signs-and-facility-identification-products',
        permanent: true,
      },
      {
        source: '/product/double-sided-foam-tape/:slug*',
        destination: '/category/packing-tape',
        permanent: true,
      },
      {
        source: '/product/dust-collector-filter/:slug*',
        destination: '/category/compressed-air-filters',
        permanent: true,
      },
      {
        source: '/product/ems-stretchers/:slug*',
        destination: '/category/medical-supplies-and-equipment',
        permanent: true,
      },
      {
        source: '/product/entrance-mats-floor-safety/:slug*',
        destination: '/category/entrance-mats',
        permanent: true,
      },
      {
        source: '/product/eye-face-protection/:slug*',
        destination: '/category/eyewash-equipment-and-safety-showers',
        permanent: true,
      },
      {
        source: '/product/first-aid-kits/:slug*',
        destination: '/category/first-aid-and-wound-care',
        permanent: true,
      },
      {
        source: '/product/first-aid-medical/:slug*',
        destination: '/category/first-aid-and-wound-care',
        permanent: true,
      },
      {
        source: '/product/first-aid-wound-care/:slug*',
        destination: '/category/first-aid-and-wound-care',
        permanent: true,
      },
      {
        source: '/product/flashlight-parts-accessories/:slug*',
        destination: '/category/floodlights',
        permanent: true,
      },
      {
        source: '/product/flashlights/:slug*',
        destination: '/category/floodlights',
        permanent: true,
      },
      {
        source: '/product/foot-protection/:slug*',
        destination: '/category/footwear-and-footwear-accessories',
        permanent: true,
      },
      {
        source: '/product/footwear-footwear-accessories/:slug*',
        destination: '/category/footwear-and-footwear-accessories',
        permanent: true,
      },
      {
        source: '/product/gaskets/:slug*',
        destination: '/category/caulks-and-sealants',
        permanent: true,
      },
      {
        source: '/product/gears-gear-drives/:slug*',
        destination: '/category/gearing',
        permanent: true,
      },
      {
        source: '/product/general-purpose-boots/:slug*',
        destination: '/category/footwear-and-footwear-accessories',
        permanent: true,
      },
      {
        source: '/product/general-purpose-safety-goggles/:slug*',
        destination: '/category/eyewash-equipment-and-safety-showers',
        permanent: true,
      },
      {
        source: '/product/hand-and-arm-protection/:slug*',
        destination: '/category/hand-and-arm-protection',
        permanent: true,
      },
      {
        source: '/product/hand-protection/:slug*',
        destination: '/category/hand-and-arm-protection',
        permanent: true,
      },
      {
        source: '/product/hand-truck-accessories-replacement-parts/:slug*',
        destination: '/category/power-tool-replacement-parts',
        permanent: true,
      },
      {
        source: '/product/hand-trucks/:slug*',
        destination: '/category/hand-tools',
        permanent: true,
      },
      {
        source: '/product/hearing-protection/:slug*',
        destination: '/category/hearing-protection',
        permanent: true,
      },
      {
        source: '/product/heat-shrink-tubing/:slug*',
        destination: '/category/cable-organizers',
        permanent: true,
      },
      {
        source: '/product/high-visibility-vests/:slug*',
        destination: '/category/workwear',
        permanent: true,
      },
      {
        source: '/product/hoists-cranes/:slug*',
        destination: '/category/lifting-magnets',
        permanent: true,
      },
      {
        source: '/product/hose-hose-fittings-and-hose-reels/:slug*',
        destination: '/category/hose-hose-fittings-and-hose-reels',
        permanent: true,
      },
      {
        source: '/product/jacks-lifts/:slug*',
        destination: '/category/personnel-lifts',
        permanent: true,
      },
      {
        source: '/product/lab-brushes/:slug*',
        destination: '/category/lab-tables',
        permanent: true,
      },
      {
        source: '/product/label-dispenser/:slug*',
        destination: '/category/signs-and-facility-identification-products',
        permanent: true,
      },
      {
        source: '/product/label-holder-plastic-pouch/:slug*',
        destination: '/category/signs-and-facility-identification-products',
        permanent: true,
      },
      {
        source: '/product/labels-identification-supplies/:slug*',
        destination: '/category/signs-and-facility-identification-products',
        permanent: true,
      },
      {
        source: '/product/leg-body-protection/:slug*',
        destination: '/category/protective-clothing',
        permanent: true,
      },
      {
        source: '/product/mechanical-seals/:slug*',
        destination: '/category/security-seals',
        permanent: true,
      },
      {
        source: '/product/moisture-absorbent-packaging/:slug*',
        destination: '/category/protective-packaging',
        permanent: true,
      },
      {
        source: '/product/mop-wringers/:slug*',
        destination: '/category/cleaning-carts',
        permanent: true,
      },
      {
        source: '/product/o-rings/:slug*',
        destination: '/category/caulks-and-sealants',
        permanent: true,
      },
      {
        source: '/product/packaging-shipping/:slug*',
        destination: '/category/packing-and-shipping-bags',
        permanent: true,
      },
      {
        source: '/product/packing-tape/:slug*',
        destination: '/category/packing-tape',
        permanent: true,
      },
      {
        source: '/product/pallet-accessories/:slug*',
        destination: '/category/strapping',
        permanent: true,
      },
      {
        source: '/product/parts-bin-drawer-organizer/:slug*',
        destination: '/category/tool-organizers',
        permanent: true,
      },
      {
        source: '/product/platform-trucks/:slug*',
        destination: '/category/work-platforms',
        permanent: true,
      },
      {
        source: '/product/plumbing-pumps/:slug*',
        destination: '/category/plumbing-valves',
        permanent: true,
      },
      {
        source: '/product/protective-clothing/:slug*',
        destination: '/category/protective-clothing',
        permanent: true,
      },
      {
        source: '/product/protective-packaging/:slug*',
        destination: '/category/protective-packaging',
        permanent: true,
      },
      {
        source: '/product/pump-accessories/:slug*',
        destination: '/category/pump-accessories',
        permanent: true,
      },
      {
        source: '/product/pvc-fitting/:slug*',
        destination: '/category/plumbing-valves',
        permanent: true,
      },
      {
        source: '/product/replacement-parts-for-jobsite-lights/:slug*',
        destination: '/category/floodlights',
        permanent: true,
      },
      {
        source: '/product/respiratory-protection/:slug*',
        destination: '/category/respiratory-protection',
        permanent: true,
      },
      {
        source: '/product/rubber/:slug*',
        destination: '/category/rubber',
        permanent: true,
      },
      {
        source: '/product/safety-padlock/:slug*',
        destination: '/category/lockout-padlocks',
        permanent: true,
      },
      {
        source: '/product/sealants-caulk/:slug*',
        destination: '/category/caulks-and-sealants',
        permanent: true,
      },
      {
        source: '/product/sealing-foam-tape/:slug*',
        destination: '/category/bag-sealing-tape',
        permanent: true,
      },
      {
        source: '/product/seals-gaskets/:slug*',
        destination: '/category/caulks-and-sealants',
        permanent: true,
      },
      {
        source: '/product/slings-rigging/:slug*',
        destination: '/category/lifting-slings',
        permanent: true,
      },
      {
        source: '/product/spiral-wrap/:slug*',
        destination: '/category/stretch-wrap',
        permanent: true,
      },
      {
        source: '/product/stainless-steel-cable-tie/:slug*',
        destination: '/category/cable-organizers',
        permanent: true,
      },
      {
        source: '/product/storage-shelving/:slug*',
        destination: '/category/lab-shelving',
        permanent: true,
      },
      {
        source: '/product/tape/:slug*',
        destination: '/category/packing-tape',
        permanent: true,
      },
      {
        source: '/product/task-jobsite-lighting/:slug*',
        destination: '/category/floodlights',
        permanent: true,
      },
      {
        source: '/product/temperature-controlled-packaging/:slug*',
        destination: '/category/protective-packaging',
        permanent: true,
      },
      {
        source: '/product/tool-storage-workbenches/:slug*',
        destination: '/category/tool-storage',
        permanent: true,
      },
      {
        source: '/product/transporting/:slug*',
        destination: '/category/strapping',
        permanent: true,
      },
      {
        source: '/product/valves-hose-fittings/:slug*',
        destination: '/category/hose-hose-fittings-and-hose-reels',
        permanent: true,
      },
      {
        source: '/product/vehicle-reflective-tapes/:slug*',
        destination: '/category/antislip-tape',
        permanent: true,
      },
      {
        source: '/product/waders/:slug*',
        destination: '/category/footwear-and-footwear-accessories',
        permanent: true,
      },
      {
        source: '/product/welding-helmets/:slug*',
        destination: '/category/welding-protective-clothing',
        permanent: true,
      },
      {
        source: '/product/welding-protection/:slug*',
        destination: '/category/welding-protective-clothing',
        permanent: true,
      },
      {
        source: '/product/wet-floor-sign/:slug*',
        destination: '/category/signs-and-facility-identification-products',
        permanent: true,
      },
      {
        source: '/product/wire-clip-mount/:slug*',
        destination: '/category/cable-organizers',
        permanent: true,
      },
      {
        source: '/product/work-platforms/:slug*',
        destination: '/category/work-platforms',
        permanent: true,
      },
      {
        source: '/product/workplace-signs-labels/:slug*',
        destination: '/category/signs-and-facility-identification-products',
        permanent: true,
      },
      {
        source: '/product/workwear/:slug*',
        destination: '/category/workwear',
        permanent: true,
      },

      // ========== Brand Redirects (4) ==========
      {
        source: '/brand/:slug*',
        destination: '/',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
