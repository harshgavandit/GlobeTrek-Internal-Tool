"""Extract source rows, disambiguate printed variant codes, and retain provenance.
Requires pdfplumber; never infers FX conversions or treats blank rates as zero.
"""
import json,re,hashlib,sys
from pathlib import Path
import pdfplumber
source=Path(sys.argv[1])
rows=[];groups={};parent=None;category='Soil Testing Lab';unpriced=[]
with pdfplumber.open(source) as pdf:
 for page_no,page in enumerate(pdf.pages,1):
  for table in page.extract_tables():
   for row in table:
    if len(row)!=4:continue
    code,description,qty,rate=[(v or '').strip() for v in row]
    description=' '.join(description.split())
    if description in ['SOIL TESTING LAB','CEMENT, CONCRETE & AGGREGATE TESTING','BITUMEN TESTING INSTRUMENTS','PETROLEUM TESTING INSTRUMENTS']:category=description.title()
    if not re.match(r'^GT-\d+|^[a-d]\.$',code):continue
    price_match=re.match(r'^([\d,]+\.\d{2})',rate)
    if code.startswith('GT') and not price_match:
     parent=(code,description,page_no)
     if code=='GT-130':unpriced.append({'code':code,'description':description,'page':page_no,'reason':'Price not supplied; calibration service is extra'})
     continue
    if not price_match:raise ValueError(f'Unresolved price: {code} page {page_no}')
    sku=code;original_code=code;note=''
    if re.match(r'^[a-d]\.$',code):
     assert parent
     base,parent_desc,parent_page=parent
     # GT-175 is printed twice for single and three gauge versions.
     discriminator='-3G' if base=='GT-175' and 'Three pressure' in parent_desc else '-1G' if base=='GT-175' else ''
     sku=base+discriminator+'-'+description.upper().replace(' ','')
     description=parent_desc+' Capacity: '+description
     original_code=base+' / '+code;note='Variant SKU derived from printed parent code and capacity'
    elif re.match(r'^GT-6[23][ab]$',code):
     assert parent
     sku=code+'-'+description+'MM';description=parent[1]+' '+description+' mm'
     note='Source repeats letter codes; head-size suffix preserves each priced variant'
    # Carry-over text at cell boundaries confirmed against the source page.
    if code=='GT-131':description=re.sub(r'^cost\s+','',description)
    if code=='GT-143':description=re.sub(r'^micron\s+','',description)
    if code=='GT-142':description+=' micron'
    # Page 23 has hidden overlapping text from the preceding row; use the visible title.
    if code=='GT-400':
     description='RING AND BALL APPARATUS (DIGITAL) - (ASTM D36) WITH ACCESSORIES '+description[description.index('Also called'):]
     note='Title transcribed from visible source page 23; overlapping hidden text excluded'
    if code=='GT-184':
     sku=code+('-HAND' if 'hand operated' in description else '-ELECTRIC');note='Source repeats GT-184; operating-mode suffix distinguishes variants'
    if code=='GT-292':
     sku=code+('-DIGITAL' if 'DIGITAL READOUT' in description else '-ELECTRICAL');note='Source repeats GT-292; model suffix distinguishes variants'
    if sku in groups:raise ValueError(f'Duplicate mapping: {sku}')
    name=description if len(description)<=180 else description[:181].rsplit(' ',1)[0].strip()
    detail=description[len(name):].lstrip(' ,;:-–—').strip() if description.startswith(name) else description
    item={'sku':sku,'name':name,'description':detail,'category':category,'unit_price':float(price_match[1].replace(',','')),'currency':'INR','source_code':original_code,'source_page':page_no,'source_quantity':qty,'mapping_note':note}
    groups[sku]=item;rows.append(item)
payload={'source_file':source.name,'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'price_list':'Gtec Price List 2022-23','currency':'INR','basis':'Ex-Work Mumbai; historical source, not a current price assertion','products':rows,'unpriced':unpriced}
Path('database/gtec-price-list-2022-23.json').write_text(json.dumps(payload,indent=2,ensure_ascii=False),encoding='utf-8')
print(f'Mapped {len(rows)} priced variants; {len(unpriced)} service entries deliberately unpriced.')
