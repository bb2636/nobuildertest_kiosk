import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { useKioskCart } from '../../contexts/KioskCartContext';
import type { KioskCartLine } from '../../contexts/KioskCartContext';
import { Button } from '../../components/ui/Button';
import { api, type MenuItem } from '../../api/client';
import { filterValidCartLines } from '../../utils/cartValidation';

const CART_CHANGED_MESSAGE = '메뉴가 변경되어 일부 상품이 장바구니에서 제거되었습니다.';

function getOptionValueLabel(name: string, t: (key: string) => string, lang: string): string {
  if (lang !== 'en') return name;
  const keyFull = `optionValue_${name}`;
  const first = name.split(' ')[0] ?? name;
  const keyFirst = `optionValue_${first}`;
  const full = t(keyFull);
  const firstVal = t(keyFirst);
  if (full && full !== keyFull) return full;
  if (firstVal && firstVal !== keyFirst) return firstVal;
  return name;
}

/** 타입별로 하나씩만 표시 (샷·시럽·우유 등 누적 없이 통합) */
function getOptionSummary(
  line: KioskCartLine,
  item: MenuItem | undefined,
  t: (key: string, options?: Record<string, unknown>) => string,
  lang: string
): string {
  if (!item) return '';
  const optionTypeKey = (type: string) => type.replace(/ \(.*\)/, '').trim();
  const getTypeLabel = (type: string) => (lang === 'en' ? (t(`optionType_${optionTypeKey(type)}`) || type) : type);
  const isShotType = (type: string) => type.includes('샷');
  const parts: string[] = [];
  if (line.temperature) parts.push(lang === 'en' ? `Temperature ${line.temperature}` : `온도 ${line.temperature}`);
  if (line.shotCount != null) parts.push(lang === 'en' ? t('shotDefault', { count: line.shotCount }) : `샷 ${line.shotCount}`);
  const byType = new Map<string, string>();
  line.optionIds.forEach((optId) => {
    const opt = item.options.find((o) => o.id === optId);
    if (opt && !isShotType(opt.type)) {
      const label = `${getTypeLabel(opt.type)} ${getOptionValueLabel(opt.name, t, lang)}`;
      byType.set(opt.type, label);
    }
  });
  const order = ['원두', '우유', '시럽', '휘핑크림', '컵/콘'];
  order.forEach((type) => {
    const label = byType.get(type);
    if (label) parts.push(label);
  });
  byType.forEach((label, type) => {
    if (!order.includes(type)) parts.push(label);
  });
  return parts.join(' | ');
}

export function KioskCart() {
  const { t, i18n } = useTranslation('kiosk');
  const navigate = useNavigate();
  const location = useLocation();
  const { lines, remove, updateQuantity, totalPrice, setLinesFromValidation } = useKioskCart();
  const [cartChangedMessage, setCartChangedMessage] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const message = (location.state as { cartChangedMessage?: string } | null)?.cartChangedMessage ?? cartChangedMessage;

  useEffect(() => {
    if (lines.length === 0) return;
    api.menu
      .list()
      .then((items) => {
        setMenuItems(items);
        const valid = filterValidCartLines(lines, items);
        if (valid.length < lines.length) {
          setLinesFromValidation(valid);
          setCartChangedMessage(CART_CHANGED_MESSAGE);
        }
      })
      .catch(() => {});
  }, []);

  const allSelected = lines.length > 0 && selected.size === lines.length;
  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(lines.map((_, i) => i)));
  };
  const toggleOne = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };
  const deleteSelected = () => {
    const indices = Array.from(selected).sort((a, b) => b - a);
    indices.forEach((i) => remove(i));
    setSelected(new Set());
  };
  const deleteAll = () => {
    lines.forEach((_, i) => remove(i));
    setSelected(new Set());
  };
  const selectedTotal = Array.from(selected).reduce(
    (sum, i) => sum + lines[i]!.unitPrice * lines[i]!.quantity,
    0
  );

  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
        <p className="text-kiosk-textSecondary mb-4">{t('cartEmpty')}</p>
        <Link to="/">
          <Button theme="kiosk">{t('viewMenu')}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[100dvh] bg-white">
      <header className="flex items-center justify-between px-4 py-3 border-b border-kiosk-border shrink-0">
        <Link to="/" className="text-kiosk-text text-sm">
          {t('backToMenu')}
        </Link>
        <h1 className="text-lg font-semibold text-kiosk-text">{t('cart')}</h1>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="p-2 -mr-2 text-kiosk-text"
          aria-label="닫기"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      <div className="flex w-full bg-kiosk-surface border-b border-kiosk-border">
        <span className="flex-1 py-3 px-4 text-sm font-medium bg-kiosk-primary text-kiosk-text text-center">
          {t('all')}
        </span>
      </div>

      <main className="flex-1 overflow-auto p-4 min-h-0">
        {message && (
          <div
            className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
            role="alert"
          >
            {message}
          </div>
        )}

        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-kiosk-text">{t('orderMenu')}</h2>
          <span className="text-sm text-kiosk-textSecondary">{t('cartTotalCount', { count: lines.length })}</span>
        </div>
        <div className="flex items-center gap-3 mb-3 text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="rounded border-kiosk-border text-kiosk-primary"
            />
            <span className="text-kiosk-textSecondary">{t('selectAll')}</span>
          </label>
          <button
            type="button"
            onClick={deleteSelected}
            disabled={selected.size === 0}
            className="text-kiosk-textSecondary hover:text-kiosk-text disabled:opacity-50"
          >
            {t('deleteSelected')}
          </button>
          <span className="text-kiosk-border">|</span>
          <button
            type="button"
            onClick={deleteAll}
            className="text-kiosk-textSecondary hover:text-kiosk-text"
          >
            {t('deleteAll')}
          </button>
        </div>

        <ul className="space-y-4 border-t border-kiosk-border pt-3">
          {lines.map((line, index) => (
            <li
              key={`${line.productId}-${index}`}
              className="flex gap-3 py-3 border-b border-kiosk-border last:border-b-0"
            >
              <label className="shrink-0 flex items-start pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.has(index)}
                  onChange={() => toggleOne(index)}
                  className="rounded border-kiosk-border text-kiosk-primary w-4 h-4 mt-0.5"
                />
              </label>
              <div className="w-14 h-14 shrink-0 rounded-full overflow-hidden bg-gray-100">
                {line.imageUrl ? (
                  <img src={line.imageUrl} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : null}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-kiosk-text truncate">{line.name}</p>
                {(line.optionIds.length > 0 || line.temperature != null || line.shotCount != null) && (
                  <>
                    <p className="text-xs text-kiosk-textSecondary mt-1">
                      {getOptionSummary(line, menuItems.find((m) => m.id === line.productId), t, i18n.language)}
                    </p>
                    <Link
                      to={`/menu/${line.productId}?editCartIndex=${index}`}
                      className="inline-block mt-1 text-xs text-kiosk-primary hover:underline"
                    >
                      {t('optionChange')}
                    </Link>
                  </>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <div className="inline-flex items-center rounded-lg border border-kiosk-border bg-white">
                    <button
                      type="button"
                      onClick={() => updateQuantity(index, Math.max(1, line.quantity - 1))}
                      className="w-8 h-8 flex items-center justify-center text-kiosk-text"
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-sm font-medium">{line.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(index, line.quantity + 1)}
                      className="w-8 h-8 flex items-center justify-center text-kiosk-text"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-semibold text-kiosk-text">
                  {(line.unitPrice * line.quantity).toLocaleString()}{t('currencyUnit')}
                </p>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="mt-1 p-1 text-kiosk-textSecondary hover:text-kiosk-error"
                  aria-label={t('delete')}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </main>

      <footer className="sticky bottom-0 border-t border-kiosk-border bg-white p-4 safe-area-pb">
        <p className="text-xs text-kiosk-textSecondary mb-2">{t('maxItemsPerOrder')}</p>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-kiosk-textSecondary">
            {selected.size > 0 ? t('selectedMenuCount', { count: selected.size }) : t('totalPayment')}
          </span>
          <span className="text-lg font-bold text-kiosk-primary">
            {(selected.size > 0 ? selectedTotal : totalPrice).toLocaleString()}{t('currencyUnit')}
          </span>
        </div>
        <Button theme="kiosk" fullWidth onClick={() => navigate('/checkout')}>
          {t('paymentBtn')}
        </Button>
      </footer>
    </div>
  );
}
