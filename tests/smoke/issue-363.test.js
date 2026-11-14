import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  DRIVE_ROOT_FOLDER_ID,
  mergeYearFolders,
  parseWeddingFolderName,
  partitionMonthFolders,
} from '../../src/lib/driveFolders.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('issue #363 Drive folder hierarchy', () => {
  it('discovers years, months, secrets and UM wedding folders', () => {
    expect(DRIVE_ROOT_FOLDER_ID).toBe('1Q7IVT0GNiLztKQE8l4eCDCRw-px1qheh');
    const years = mergeYearFolders([
      { id: '2026', name: '2026', mimeType: 'application/vnd.google-apps.folder' },
    ]);
    expect(years.map((year) => year.name)).toEqual(['2026', '2027', '2028']);

    const partition = partitionMonthFolders([
      { id: 'sep', name: 'September', mimeType: 'application/vnd.google-apps.folder' },
      { id: 'secrets', name: 'secrets', mimeType: 'application/vnd.google-apps.folder' },
      { id: 'w1', name: 'UM-2027-09-001', mimeType: 'application/vnd.google-apps.folder' },
      { id: 'other', name: 'random', mimeType: 'application/vnd.google-apps.folder' },
    ]);
    expect(partition.months.map((month) => month.name)).toEqual(['September']);
    expect(partition.secrets.id).toBe('secrets');
    expect(partition.weddings[0].wedding.cartridgeName).toBe('UM-2027-09-001');
  });

  it('parses the wedding folder pattern', () => {
    expect(parseWeddingFolderName('UM-2027-09-001')).toMatchObject({
      year: '2027',
      month: '09',
      sequence: '001',
    });
    expect(parseWeddingFolderName('UM-27-9-1')).toBeNull();
    expect(parseWeddingFolderName('Wedding')).toBeNull();
  });

  it('adds admin API and Drive connector folder traversal', () => {
    expect(read('supabase/functions/_shared/googleDrive.js')).toContain('listChildren');
    expect(read('supabase/functions/admin_drive/index.ts')).toContain("'children'");
    expect(read('src/admin/adminApi.js')).toContain('listDriveChildren');
  });

  it('shows year tabs and month wedding folders in admin UI', () => {
    const ui = read('src/admin/AdminWeddingFolders.jsx');
    expect(ui).toContain('Wedding folders');
    expect(ui).toContain('setSelectedYearId');
    expect(ui).toContain('month.weddings');
    expect(ui).toContain('cartridgeName');
    expect(read('src/admin/AdminDrivePanel.jsx')).toContain('<AdminWeddingFolders />');
  });
});
