import React from 'react';
import { pdfStyles } from './pdfStyles';

interface ReportHeaderProps {
  title: string;
  idea: string;
  pageNumber: number;
}

export function ReportHeader({ title, idea, pageNumber }: ReportHeaderProps) {
  return (
    <div style={pdfStyles.pageHeader}>
      <div style={pdfStyles.pageHeaderLeft}>
        <span style={pdfStyles.pageHeaderTitle} title={idea}>{idea}</span>
        <span style={pdfStyles.pageHeaderSeparator}>|</span>
        <span style={{ ...pdfStyles.pageHeaderSection, flexShrink: 0 }}>{title}</span>
      </div>
      <div style={pdfStyles.pageHeaderLogo}>AIWMC</div>
    </div>
  );
}

interface ReportFooterProps {
  pageNumber: number;
  isLast?: boolean;
}

export function ReportFooter({ pageNumber, isLast }: ReportFooterProps) {
  const currentYear = new Date().getFullYear();
  
  return (
    <div style={pdfStyles.pageFooter}>
      <div style={pdfStyles.footerLeft}>
        CONFIDENTIAL | AIWMC TM | {new Date().toLocaleDateString('en-US')}
      </div>
      <div style={pdfStyles.footerCenter}>
        {isLast ? (
          <span style={pdfStyles.footerCopyright}>
            {currentYear} AIWMC - AI Workforce Management Center. All Rights Reserved.
          </span>
        ) : null}
      </div>
      <div style={pdfStyles.footerRight}>
        Page {pageNumber} of 9
      </div>
    </div>
  );
}
