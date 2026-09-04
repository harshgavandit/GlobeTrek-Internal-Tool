"use client";

import React from 'react';
import { Check, Plus, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  EmptyState,
  InlineError,
  LoadingState,
  SearchInput,
} from '@/components/workspace/primitives';
import { Category, Product, price_lists as PriceList } from '@/types';
import { db } from '@/lib/db';
import { formatCurrency } from '@/lib/utils';
import { useDebouncedValue } from '@/lib/ui-hooks';

interface ProductSearchBarProps {
  selectedPriceListId: string;
  onAddProduct: (product: Product, price: number) => void;
  excludedProductIds?: string[];
}

export function ProductSearchBar({
  selectedPriceListId,
  onAddProduct,
  excludedProductIds = [],
}: ProductSearchBarProps) {
  const [query, setQuery] = React.useState('');
  const debounced = useDebouncedValue(query);
  const [category, setCategory] = React.useState('all');
  const [products, setProducts] = React.useState<Product[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [lists, setLists] = React.useState<PriceList[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [active, setActive] = React.useState(0);
  const input = React.useRef<HTMLInputElement>(null);
  const resultListId = React.useId();

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [nextProducts, nextCategories, nextLists] = await Promise.all([
        db.fetchProducts(),
        db.fetchCategories(),
        db.fetchPriceLists(),
      ]);
      setProducts(nextProducts);
      setCategories(nextCategories);
      setLists(nextLists);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load products.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh, selectedPriceListId]);

  const searchActive = debounced.trim().length > 0 || category !== 'all';
  const matches = React.useMemo(
    () =>
      searchActive
        ? products.filter(
            (product) =>
              product.is_active &&
              (category === 'all' || product.category_id === category) &&
              `${product.name} ${product.sku} ${product.model_number || ''}`
                .toLowerCase()
                .includes(debounced.trim().toLowerCase()),
          )
        : [],
    [products, category, debounced, searchActive],
  );
  const results = matches.slice(0, 6);
  const currency = lists.find((list) => list.id === selectedPriceListId)?.currency;

  React.useEffect(() => setActive(0), [debounced, category]);

  const add = (product: Product) => {
    const price = product.prices?.find(
      (candidate) => candidate.price_list_id === selectedPriceListId,
    );
    if (price && !excludedProductIds.includes(product.id)) {
      onAddProduct(product, price.unit_price);
      input.current?.focus();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <div className="min-w-48 flex-1">
          <SearchInput
            ref={input}
            value={query}
            onValueChange={setQuery}
            placeholder="Search product name, SKU, or model…"
            role="combobox"
            aria-expanded={searchActive && results.length > 0}
            aria-controls={searchActive ? resultListId : undefined}
            aria-activedescendant={results[active] ? `${resultListId}-${active}` : undefined}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setActive((index) => Math.min(index + 1, Math.max(0, results.length - 1)));
              }
              if (event.key === 'ArrowUp') {
                event.preventDefault();
                setActive((index) => Math.max(0, index - 1));
              }
              if (event.key === 'Enter' && results[active]) {
                event.preventDefault();
                add(results[active]);
              }
            }}
          />
        </div>
        <select
          className="select-control w-full sm:w-44"
          aria-label="Product category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          <option value="all">All categories</option>
          {categories.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <Button
          variant="outline"
          size="icon"
          aria-label="Refresh product prices"
          disabled={loading}
          onClick={refresh}
        >
          <RefreshCw className={loading ? 'size-4 animate-spin' : 'size-4'} />
        </Button>
      </div>

      <InlineError message={error} onRetry={refresh} />

      {loading ? (
        <LoadingState rows={2} label="Loading current product prices…" />
      ) : !searchActive ? (
        <EmptyState
          compact
          icon={Search}
          title="Find a product"
          description="Type a product name, SKU, or model, or choose a category to browse priced products."
        />
      ) : !results.length ? (
        <EmptyState
          compact
          icon={Search}
          title="No products found"
          description="Try another name, SKU, model, or category."
        />
      ) : (
        <div
          role="listbox"
          id={resultListId}
          aria-label="Product search results"
          className="divide-y overflow-hidden rounded-lg border"
        >
          {results.map((product, index) => {
            const price = product.prices?.find(
              (candidate) => candidate.price_list_id === selectedPriceListId,
            );
            const added = excludedProductIds.includes(product.id);
            return (
              <div
                key={product.id}
                role="option"
                aria-selected={active === index}
                id={`${resultListId}-${index}`}
                className={`flex items-center gap-3 p-3 ${
                  active === index ? 'bg-blue-50/60' : 'bg-white'
                }`}
                onMouseEnter={() => setActive(index)}
              >
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-[13px] font-medium" title={product.name}>
                    {product.name}
                  </p>
                  <p className="mt-1 truncate text-[11px] text-muted-foreground">
                    {product.sku} · {product.category?.name || 'Uncategorized'}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[11px] text-muted-foreground">Master price</p>
                  <p className="text-xs font-medium tabular-nums">
                    {price ? formatCurrency(price.unit_price, currency) : 'Not priced'}
                  </p>
                </div>
                <Button
                  variant={added ? 'ghost' : 'outline'}
                  size="sm"
                  className="shrink-0 px-2"
                  aria-label={`Add ${product.name}`}
                  disabled={added || !price || !selectedPriceListId}
                  onClick={() => add(product)}
                >
                  {added ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
                  <span className="ml-1 hidden sm:inline">{added ? 'Added' : 'Add'}</span>
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {searchActive && results.length > 0 && (
        <p className="text-[11px] text-muted-foreground" aria-live="polite">
          {matches.length > 6 ? `Showing 6 of ${matches.length}. Refine your search. ` : ''}
          Use ↑ ↓ to choose a result and Enter to add. Prices are checked again when saving.
        </p>
      )}
    </div>
  );
}
