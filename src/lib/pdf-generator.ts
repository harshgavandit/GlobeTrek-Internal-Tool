import { Quotation,CompanySettings } from '@/types';
import { downloadQuotation } from './download-quotation';
export const generateQuotationPDF=(q:Quotation,_settings?:CompanySettings)=>downloadQuotation(q,'pdf');
