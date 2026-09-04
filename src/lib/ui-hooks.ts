"use client";
import {useCallback,useEffect,useRef,useState} from 'react';
export function useAsyncData<T>(loader:()=>Promise<T>,initial:T){
 const latest=useRef(loader);latest.current=loader;
 const [data,setData]=useState(initial),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const mounted=useRef(true),request=useRef(0);
 const reload=useCallback(async()=>{const token=++request.current;setLoading(true);setError('');try{const value=await latest.current();if(mounted.current&&token===request.current)setData(value);}catch(e){if(mounted.current&&token===request.current)setError(e instanceof Error?e.message:'Unable to load this page. Please retry.');}finally{if(mounted.current&&token===request.current)setLoading(false);}},[]);
 useEffect(()=>{mounted.current=true;void reload();return()=>{mounted.current=false;};},[reload]);
 return {data,setData,loading,error,reload};
}
export function useDebouncedValue<T>(value:T,delay=250){const [debounced,setDebounced]=useState(value);useEffect(()=>{const timer=setTimeout(()=>setDebounced(value),delay);return()=>clearTimeout(timer);},[value,delay]);return debounced;}
