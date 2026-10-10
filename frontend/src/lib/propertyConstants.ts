export const PROPERTY_DIVISIONS: Record<string, string[]> = {
  'Residential': ['Independent House', 'Villa', 'Flat / Apartment', 'Duplex', 'Residential Land / Plot'],
  'Commercial': ['Shop', 'Showroom', 'Office Space', 'Commercial Building', 'Hotel', 'Restaurant', 'Commercial Land'],
  'Industrial': ['Factory', 'Manufacturing Unit', 'Warehouse', 'Industrial Shed', 'Industrial Land'],
  'Agricultural': ['Agricultural Land', 'Plantation', 'Paddy Field', 'Orchard', 'Farmhouse'],
  'Mixed-Use': ['Shop with Residence', 'Commercial Building with Residential Units']
};

export const PROPERTY_DIVISIONS_LIST = Object.keys(PROPERTY_DIVISIONS);
export const PROPERTY_TYPES_LIST = Object.values(PROPERTY_DIVISIONS).flat();

// Helpers for dynamic field rendering
export const isBhkApplicable = (type: string) => {
  if (!type) return true;
  return ['Independent House', 'Flat / Apartment', 'Villa', 'Duplex', 'Shop with Residence', 'Commercial Building with Residential Units', 'Farmhouse'].includes(type);
};
