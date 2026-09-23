import type { CompanySettings, Quotation } from '@/types';
import { downloadQuotation } from './download-quotation';

export const generateQuotationWord = (quotation: Quotation, _settings?: CompanySettings) =>
  downloadQuotation(quotation, 'docx');
