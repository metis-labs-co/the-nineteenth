/**
 * Custom hole tees — user-defined tee box positions for a course/hole that
 * supplement the GolfAPI-imported `hole_coordinates` (which only carry
 * `tee_back` and `tee_front`).
 *
 * Stored in a separate table from `hole_coordinates` so a course-data refresh
 * (which re-imports from GolfAPI) doesn't wipe out the user's custom tees.
 */

/** Standard golf tee colours users can pick when adding a custom tee. */
export type CustomTeeColor =
  | 'red'
  | 'white'
  | 'blue'
  | 'gold'
  | 'black'
  | 'silver';

export const CUSTOM_TEE_COLORS: { key: CustomTeeColor; label: string; swatch: string }[] = [
  { key: 'red', label: 'Red', swatch: '#E53935' },
  { key: 'white', label: 'White', swatch: '#F5F5F5' },
  { key: 'blue', label: 'Blue', swatch: '#1E88E5' },
  { key: 'gold', label: 'Gold', swatch: '#F9A825' },
  { key: 'black', label: 'Black', swatch: '#212121' },
  { key: 'silver', label: 'Silver', swatch: '#9E9E9E' },
];

export interface CustomHoleTee {
  id: string;
  course_id: string;
  hole_number: number;
  user_id: string;
  latitude: number;
  longitude: number;
  color: CustomTeeColor;
  created_at: string;
}

export type CustomHoleTeeInsert = Pick<
  CustomHoleTee,
  'course_id' | 'hole_number' | 'latitude' | 'longitude' | 'color'
>;
