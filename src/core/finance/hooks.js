/**
 * Finance domain hooks.
 * processData: Called after fetching rows, before export.
 *              Use for calculations, totals, derived columns.
 */
export default {
  async processData(rows, closeDate) {
    // Placeholder: add a TOTAL row if numeric columns exist
    // Replace with real business logic as needed
    return rows;
  },
};
