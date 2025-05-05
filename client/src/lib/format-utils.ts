/**
 * Format-utils.ts
 * Utility functions for formatting data in the application
 */

/**
 * Formats a full address from supermarket data, showing only commune and province (not region)
 * @param address Base address string
 * @param communeName Name of the commune
 * @param provinceName Name of the province
 * @returns Formatted address string with only commune and province
 */
export function formatFullAddress(
  address?: string, 
  communeName?: string, 
  provinceName?: string
): string {
  // Start with the base address or empty string
  let formattedAddress = address || '';
  
  // Add commune if available
  if (communeName) {
    if (formattedAddress) formattedAddress += ', ';
    formattedAddress += communeName;
  }
  
  // Add province if available
  if (provinceName) {
    if (formattedAddress) formattedAddress += ', ';
    formattedAddress += provinceName;
  }
  
  return formattedAddress || 'Không có địa chỉ';
}

/**
 * Format a date to dd/MM/yyyy format
 */
export function formatDate(date: Date | string | undefined): string {
  if (!date) return '';
  
  const d = date instanceof Date ? date : new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  return `${day}/${month}/${year}`;
}