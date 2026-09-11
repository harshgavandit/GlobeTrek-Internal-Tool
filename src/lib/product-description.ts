const comparable=(value:string)=>value.replace(/\s+/g,' ').trim().toLocaleLowerCase();

/** Return only description text that is not already present in the product name. */
export function productDescriptionDetail(name:string,description?:string|null){
 const title=name.trim(),detail=(description||'').trim();
 if(!detail)return '';
 if(comparable(detail)===comparable(title))return '';
 const nextCharacter=detail.slice(title.length,title.length+1);
 if(detail.length>=title.length&&comparable(detail.slice(0,title.length))===comparable(title)&&(!nextCharacter||/[\s,;:\-–—]/u.test(nextCharacter)))return detail.slice(title.length).replace(/^[\s,;:\-–—]+/u,'').trim();
 return detail;
}

export function productDescriptionText(name:string,description?:string|null,modelNumber?:string|null){
 return [name.trim(),modelNumber?.trim()?`Model: ${modelNumber.trim()}`:'',productDescriptionDetail(name,description)].filter(Boolean).join('\n');
}
