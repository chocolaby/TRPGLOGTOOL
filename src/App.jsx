import React, { useMemo, useState } from 'react';
import mammoth from 'mammoth';
import html2pdf from 'html2pdf.js';
import { AlignmentType, Document, Packer, Paragraph, TextRun } from 'docx';
import { parseLog } from './utils';
import './App.css';

function App() {
  const [logs, setLogs] = useState([]);
  const [charSettings, setCharSettings] = useState({});
  const [fileName, setFileName] = useState('');
  const [globalStyle, setGlobalStyle] = useState({
    fontSize: 16,
    lineHeight: 1.8,
    fontFamily: 'Noto Sans SC',
  });
  const [nameStyle, setNameStyle] = useState({
    ownLine: false,
    align: 'left',
    fontSize: 16,
    bold: true,
    lineHeight: 1.2,
  });

  const fontOptions = useMemo(
    () => [
      'Noto Sans SC',
      'Source Han Sans SC',
      'PingFang SC',
      'Microsoft YaHei',
      'Heiti SC',
    ],
    []
  );

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = async (readerEvent) => {
      const arrayBuffer = readerEvent.target.result;
      const result = await mammoth.extractRawText({ arrayBuffer });
      const { parsedData, uniqueCharacters } = parseLog(result.value);
      setLogs(parsedData);

      const initialCharSettings = {};
      uniqueCharacters.forEach((name) => {
        initialCharSettings[name] = {
          color: '#1a202c',
          alias: name,
          visible: true,
        };
      });
      setCharSettings((prev) => ({
        ...initialCharSettings,
        ...prev,
      }));
    };
    reader.readAsArrayBuffer(file);
  };

  const normalizeColor = (color, fallback = '111111') => {
    if (!color) return fallback;
    const cleaned = color.replace('#', '').trim();
    return cleaned.length === 6 ? cleaned.toUpperCase() : fallback;
  };

  const pxToTwips = (px) => Math.round(px * 20);

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const element = document.getElementById('script-render-area');
    if (!element) return;
    const opt = {
      margin: 15,
      filename: '剧本记录.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    };
    html2pdf().set(opt).from(element).save();
  };

  const exportText = () => {
    const element = document.getElementById('script-render-area');
    const text = element ? element.innerText : '';
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    downloadBlob(blob, '剧本记录.txt');
  };

  const exportMarkdown = () => {
    const element = document.getElementById('script-render-area');
    const text = element ? element.innerText : '';
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    downloadBlob(blob, '剧本记录.md');
  };

  const exportHTML = () => {
    const element = document.getElementById('script-render-area');
    if (!element) return;
    const html = `<!doctype html><html><head><meta charset="utf-8" />
<title>剧本记录</title>
<style>
body { font-family: ${globalStyle.fontFamily}; line-height: ${globalStyle.lineHeight}; font-size: ${globalStyle.fontSize}px; }
.name-line { text-align: ${nameStyle.align}; font-size: ${nameStyle.fontSize}px; line-height: ${nameStyle.lineHeight}; font-weight: ${nameStyle.bold ? 600 : 400}; }
.narration-line { color: #4a5568; }
</style></head><body>${element.innerHTML}</body></html>`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    downloadBlob(blob, '剧本记录.html');
  };

  const exportWord = async () => {
    if (!logs.length) return;
    const paragraphs = [];
    const baseFontSize = pxToTwips(globalStyle.fontSize);
    const nameFontSize = pxToTwips(nameStyle.ownLine ? nameStyle.fontSize : globalStyle.fontSize);
    const nameSpacingAfter = nameStyle.ownLine
      ? pxToTwips(globalStyle.fontSize * globalStyle.lineHeight)
      : 0;

    logs.forEach((log) => {
      const charSet = charSettings[log.name];
      const isDialogue = log.type === 'dialogue';
      const displayName = charSet?.alias || log.name;
      const visibleName = `<${displayName}>`;
      const nameColor = normalizeColor(charSet?.color || '#111111');
      const nameBold = nameStyle.ownLine ? nameStyle.bold : false;

      if (isDialogue && nameStyle.ownLine) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: visibleName,
                bold: nameBold,
                size: nameFontSize,
                color: nameColor,
              }),
            ],
            alignment: nameStyle.align === 'center' ? AlignmentType.CENTER : AlignmentType.LEFT,
            spacing: { after: nameSpacingAfter },
          })
        );

        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: log.content,
                size: baseFontSize,
                color: nameColor,
              }),
            ],
          })
        );
        return;
      }

      if (isDialogue && !nameStyle.ownLine) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${visibleName} `,
                bold: nameBold,
                size: nameFontSize,
                color: nameColor,
              }),
              new TextRun({
                text: log.content,
                size: baseFontSize,
                color: nameColor,
              }),
            ],
          })
        );
        return;
      }

      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: log.content,
              size: baseFontSize,
              color: '4A5568',
            }),
          ],
        })
      );
    });

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: paragraphs,
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    downloadBlob(blob, '剧本记录.docx');
  };

  return (
    <div className="app-container">
      <div className="control-panel">
        <h2>TRPG跑团记录美化器</h2>
        <div className="section">
          <label className="file-picker">
            <input className="file-input" type="file" accept=".docx" onChange={handleFileUpload} />
            <span className="file-button">选择文件</span>
            <span className="file-name">{fileName || '未选择文件'}</span>
          </label>
        </div>

        <div className="section">
          <h3>全局排版</h3>
          <div className="field-row">
            <label className="field inline">字体
              <select
                value={globalStyle.fontFamily}
                onChange={(e) => setGlobalStyle({ ...globalStyle, fontFamily: e.target.value })}
              >
                {fontOptions.map((font) => (
                  <option key={font} value={font}>{font}</option>
                ))}
              </select>
            </label>
            <div className="stack">
              <label className="field">字号: {globalStyle.fontSize}px
                <input
                  type="range"
                  min="12"
                  max="24"
                  value={globalStyle.fontSize}
                  onChange={(e) => setGlobalStyle({ ...globalStyle, fontSize: Number(e.target.value) })}
                />
              </label>
              <label className="field">行距: {globalStyle.lineHeight}
                <input
                  type="range"
                  min="1.0"
                  max="3.0"
                  step="0.1"
                  value={globalStyle.lineHeight}
                  onChange={(e) => setGlobalStyle({ ...globalStyle, lineHeight: Number(e.target.value) })}
                />
              </label>
            </div>
          </div>
          <label className="field checkbox">
            <input
              type="checkbox"
              checked={nameStyle.ownLine}
              onChange={(e) => setNameStyle({ ...nameStyle, ownLine: e.target.checked })}
            />
            角色名字独占一行
          </label>

          {nameStyle.ownLine && (
            <>
              <div className="field-row">
                <label className="field inline">位置
                  <select
                    value={nameStyle.align}
                    onChange={(e) => setNameStyle({ ...nameStyle, align: e.target.value })}
                  >
                    <option value="left">左侧</option>
                    <option value="center">居中</option>
                  </select>
                </label>
                <label className="field inline">粗体
                  <select
                    value={nameStyle.bold ? 'bold' : 'normal'}
                    onChange={(e) => setNameStyle({ ...nameStyle, bold: e.target.value === 'bold' })}
                  >
                    <option value="bold">加粗</option>
                    <option value="normal">正常</option>
                  </select>
                </label>
              </div>
              <label className="field">字号: {nameStyle.fontSize}px
                <input
                  type="range"
                  min="12"
                  max="22"
                  value={nameStyle.fontSize}
                  onChange={(e) => setNameStyle({ ...nameStyle, fontSize: Number(e.target.value) })}
                />
              </label>
              <label className="field">行距: {nameStyle.lineHeight}
                <input
                  type="range"
                  min="1.0"
                  max="2.0"
                  step="0.1"
                  value={nameStyle.lineHeight}
                  onChange={(e) => setNameStyle({ ...nameStyle, lineHeight: Number(e.target.value) })}
                />
              </label>
            </>
          )}
        </div>

        <div className="section">
          <h3>文本设置</h3>
          {Object.keys(charSettings).map((name) => (
            <div key={name} className="card">
              <strong>原名：{name}</strong>
              <div className="row">
                <input
                  type="color"
                  value={charSettings[name].color}
                  onChange={(e) => setCharSettings({
                    ...charSettings,
                    [name]: { ...charSettings[name], color: e.target.value },
                  })}
                />
                <input
                  type="text"
                  placeholder="修改显示名称"
                  value={charSettings[name].alias}
                  onChange={(e) => setCharSettings({
                    ...charSettings,
                    [name]: { ...charSettings[name], alias: e.target.value },
                  })}
                />
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={charSettings[name].visible}
                    onChange={(e) => setCharSettings({
                      ...charSettings,
                      [name]: { ...charSettings[name], visible: e.target.checked },
                    })}
                  />
                  显示角色
                </label>
              </div>
            </div>
          ))}
        </div>

        <div className="section">
          <h3>导出</h3>
          <div className="button-grid">
            <button onClick={exportPDF}>导出 PDF</button>
            <button onClick={exportWord}>导出 Word (.docx)</button>
            <button onClick={exportHTML}>导出 HTML</button>
            <button onClick={exportMarkdown}>导出 Markdown</button>
            <button onClick={exportText}>导出 TXT</button>
          </div>
        </div>
      </div>

      <div className="render-panel">
        <div
          id="script-render-area"
          className="script-render-area"
          contentEditable
          suppressContentEditableWarning
          style={{
            fontSize: `${globalStyle.fontSize}px`,
            lineHeight: globalStyle.lineHeight,
            fontFamily: globalStyle.fontFamily,
          }}
        >
          {logs.length === 0 && (
            <div className="empty-state">待上传文件</div>
          )}
          {logs.map((log) => {
            const charSet = charSettings[log.name];
            const isDialogue = log.type === 'dialogue';
            if (charSet?.visible === false && isDialogue) {
              return (
                <div key={log.id} className="render-block narration-line">
                  {log.content}
                </div>
              );
            }

            const displayName = charSet?.alias || log.name;
            const visibleName = `<${displayName}>`;
            const textColor = charSet?.color || '#1a202c';

            return (
              <div key={log.id} className="render-block">
                {isDialogue && nameStyle.ownLine && (
                  <div
                    className="name-line"
                    style={{
                      textAlign: nameStyle.align,
                      fontSize: `${nameStyle.fontSize}px`,
                      fontWeight: nameStyle.bold ? 600 : 400,
                      lineHeight: nameStyle.lineHeight,
                      color: textColor,
                      marginBottom: `${nameStyle.ownLine ? 6 : 0}px`,
                    }}
                  >
                    {visibleName}
                  </div>
                )}

                <div
                  className={isDialogue ? 'dialogue-line' : 'narration-line'}
                  style={{
                    color: isDialogue ? textColor : '#4a5568',
                  }}
                >
                  {isDialogue && !nameStyle.ownLine ? `${visibleName} ${log.content}` : log.content}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default App;
