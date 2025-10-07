/**
 * Unit tests for file type detection utility
 */

import { getDisplayType, determineJobType, getFileTypeForDB } from './fileType';

describe('File Type Detection', () => {
  describe('getDisplayType', () => {
    test('should detect Excel files by MIME type', () => {
      expect(getDisplayType('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')).toBe('Excel');
      expect(getDisplayType('application/vnd.ms-excel')).toBe('Excel');
      expect(getDisplayType('application/vnd.ms-excel.sheet.macroenabled.12')).toBe('Excel');
    });

    test('should detect Excel files by extension with octet-stream', () => {
      expect(getDisplayType('application/octet-stream', 'test.xlsx')).toBe('Excel');
      expect(getDisplayType('application/octet-stream', 'test.xls')).toBe('Excel');
      expect(getDisplayType('application/octet-stream', 'test.xlsm')).toBe('Excel');
    });

    test('should detect CSV files', () => {
      expect(getDisplayType('text/csv')).toBe('CSV');
      expect(getDisplayType('application/octet-stream', 'test.csv')).toBe('CSV');
      expect(getDisplayType(undefined, 'data.csv')).toBe('CSV');
    });

    test('should detect image files', () => {
      expect(getDisplayType('image/png')).toBe('Image');
      expect(getDisplayType('image/jpeg')).toBe('Image');
      expect(getDisplayType('image/gif')).toBe('Image');
      expect(getDisplayType('application/octet-stream', 'photo.jpg')).toBe('Image');
      expect(getDisplayType(undefined, 'image.png')).toBe('Image');
    });

    test('should detect other file types', () => {
      expect(getDisplayType('application/pdf')).toBe('PDF');
      expect(getDisplayType('text/plain')).toBe('Text');
      expect(getDisplayType('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe('Word');
      expect(getDisplayType('application/msword')).toBe('Word');
    });

    test('should return Unknown for unrecognized types', () => {
      expect(getDisplayType('application/unknown')).toBe('Unknown');
      expect(getDisplayType('', 'file.xyz')).toBe('Unknown');
      expect(getDisplayType()).toBe('Unknown');
    });

    test('should be case insensitive', () => {
      expect(getDisplayType('APPLICATION/VND.OPENXMLFORMATS-OFFICEDOCUMENT.SPREADSHEETML.SHEET')).toBe('Excel');
      expect(getDisplayType('TEXT/CSV')).toBe('CSV');
      expect(getDisplayType('IMAGE/PNG')).toBe('Image');
      expect(getDisplayType(undefined, 'TEST.XLSX')).toBe('Excel');
    });
  });

  describe('determineJobType', () => {
    test('should map Excel files to EXCEL job type', () => {
      expect(determineJobType('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')).toBe('EXCEL');
      expect(determineJobType('application/vnd.ms-excel')).toBe('EXCEL');
      expect(determineJobType('application/octet-stream', 'test.xlsx')).toBe('EXCEL');
    });

    test('should map CSV files to CSV job type', () => {
      expect(determineJobType('text/csv')).toBe('CSV');
      expect(determineJobType(undefined, 'data.csv')).toBe('CSV');
    });

    test('should map image files to IMAGE job type', () => {
      expect(determineJobType('image/png')).toBe('IMAGE');
      expect(determineJobType('image/jpeg')).toBe('IMAGE');
      expect(determineJobType(undefined, 'photo.jpg')).toBe('IMAGE');
    });

    test('should return UNKNOWN for unrecognized types', () => {
      expect(determineJobType('application/pdf')).toBe('UNKNOWN');
      expect(determineJobType('text/plain')).toBe('UNKNOWN');
      expect(determineJobType()).toBe('UNKNOWN');
    });
  });

  describe('getFileTypeForDB', () => {
    test('should map Excel files to xlsx for database', () => {
      expect(getFileTypeForDB('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')).toBe('xlsx');
      expect(getFileTypeForDB('application/vnd.ms-excel')).toBe('xlsx');
      expect(getFileTypeForDB('application/octet-stream', 'test.xlsx')).toBe('xlsx');
    });

    test('should map CSV files to csv for database', () => {
      expect(getFileTypeForDB('text/csv')).toBe('csv');
      expect(getFileTypeForDB(undefined, 'data.csv')).toBe('csv');
    });

    test('should map image files to image for database', () => {
      expect(getFileTypeForDB('image/png')).toBe('image');
      expect(getFileTypeForDB('image/jpeg')).toBe('image');
      expect(getFileTypeForDB(undefined, 'photo.jpg')).toBe('image');
    });

    test('should default to xlsx for unknown types to satisfy DB constraint', () => {
      expect(getFileTypeForDB('application/pdf')).toBe('xlsx');
      expect(getFileTypeForDB('text/plain')).toBe('xlsx');
      expect(getFileTypeForDB()).toBe('xlsx');
    });
  });

  describe('Edge cases', () => {
    test('should handle empty strings and undefined values', () => {
      expect(getDisplayType('', '')).toBe('Unknown');
      expect(getDisplayType(undefined, undefined)).toBe('Unknown');
      expect(getDisplayType(null as any, null as any)).toBe('Unknown');
    });

    test('should handle mixed case file extensions', () => {
      expect(getDisplayType(undefined, 'File.XLSX')).toBe('Excel');
      expect(getDisplayType(undefined, 'DATA.Csv')).toBe('CSV');
      expect(getDisplayType(undefined, 'Image.JPG')).toBe('Image');
    });

    test('should handle files with multiple dots in name', () => {
      expect(getDisplayType(undefined, 'my.data.file.xlsx')).toBe('Excel');
      expect(getDisplayType(undefined, 'export.2024.csv')).toBe('CSV');
      expect(getDisplayType(undefined, 'photo.backup.png')).toBe('Image');
    });

    test('should prioritize MIME type over filename extension', () => {
      // If MIME type is Excel but filename suggests CSV, MIME type wins
      expect(getDisplayType('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'file.csv')).toBe('Excel');
      expect(getDisplayType('text/csv', 'file.xlsx')).toBe('CSV');
      expect(getDisplayType('image/png', 'file.xlsx')).toBe('Image');
    });

    test('should handle octet-stream fallback correctly', () => {
      // octet-stream should only trigger Excel detection with Excel extensions
      expect(getDisplayType('application/octet-stream', 'file.xlsx')).toBe('Excel');
      expect(getDisplayType('application/octet-stream', 'file.csv')).toBe('CSV');
      expect(getDisplayType('application/octet-stream', 'file.png')).toBe('Image');
      expect(getDisplayType('application/octet-stream', 'file.txt')).toBe('Unknown');
    });
  });
});
