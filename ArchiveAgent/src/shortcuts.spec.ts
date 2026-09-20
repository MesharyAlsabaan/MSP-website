import { folderShortcutContent } from './shortcuts';

describe('folderShortcutContent', () => {
  it('produces file://Server/share/... for a UNC folder', () => {
    const url = folderShortcutContent('\\\\Server\\Contracting\\الموردون المعتمدون\\مقاولون عامون\\SUP-000001 - شركة').split('\r\n')[1];
    expect(url).toBe('URL=file://Server/Contracting/الموردون المعتمدون/مقاولون عامون/SUP-000001 - شركة');
  });

  it('produces file:///C:/... for a local folder', () => {
    const url = folderShortcutContent('C:\\archive\\SUP-000001 - شركة').split('\r\n')[1];
    expect(url).toBe('URL=file:///C:/archive/SUP-000001 - شركة');
  });

  it('is a well-formed Internet Shortcut', () => {
    const content = folderShortcutContent('C:\\x');
    expect(content.startsWith('[InternetShortcut]\r\nURL=')).toBe(true);
    expect(content).toContain('IconFile=');
  });
});
