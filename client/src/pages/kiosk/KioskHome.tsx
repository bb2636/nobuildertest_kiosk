import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, Maximize2, RefreshCw, ShoppingCart, User, X } from 'lucide-react';
import { useKioskCart } from '../../contexts/KioskCartContext';
import { useAuth } from '../../contexts/AuthContext';
import { useMenuCache } from '../../contexts/MenuCacheContext';
import { setLocale } from '../../i18n';
import { isCapacitorApp } from '../../api/client';

export function KioskHome() {
  const { t, i18n } = useTranslation('kiosk');
  const { user } = useAuth();
  const { lines, clear, remove, updateQuantity } = useKioskCart();
  const { categories, items, isInitialized, revalidate } = useMenuCache();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const didRevalidateRef = useRef(false);

  const cartCount = lines.reduce((sum, l) => sum + l.quantity, 0);
  const totalPrice = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);

  /** 홈 진입 시 배경 재검증 1회 (변경된 경우에만 캐시 갱신, 화면은 캐시로 즉시 표시) */
  useEffect(() => {
    if (!isInitialized || didRevalidateRef.current) return;
    didRevalidateRef.current = true;
    revalidate();
    return () => {
      didRevalidateRef.current = false;
    };
  }, [isInitialized, revalidate]);

  const displayItems = items.filter((i) => !selectedCategoryId || i.categoryId === selectedCategoryId);

  if (!isInitialized) {
    return (
      <div className="flex flex-col min-h-[100dvh] bg-[#f5f5f5] items-center justify-center">
        <p className="text-kiosk-textSecondary">{t('loadingMenu')}</p>
      </div>
    );
  }

  if (isCapacitorApp() && categories.length === 0) {
    return (
      <div className="flex flex-col min-h-[100dvh] bg-[#f5f5f5] items-center justify-center p-4 text-center">
        <p className="text-kiosk-text mb-2">서버에 연결할 수 없습니다.</p>
        <p className="text-sm text-kiosk-textSecondary mb-4">
          로그인 화면에서 &apos;모바일 앱 연결&apos;에 PC 주소를 입력해 주세요.
          <br />
          (예: http://10.140.140.147:3001)
        </p>
        <Link to="/login" className="text-kiosk-primary font-medium underline">
          로그인 화면으로 이동
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#f5f5f5]">
      <header className="flex items-center justify-between px-4 md:px-6 py-3 bg-white border-b border-kiosk-border">
        <Link to="/" className="text-lg font-semibold text-kiosk-text">
          FELN
        </Link>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg overflow-hidden border border-kiosk-border bg-kiosk-surface">
            {(['ko', 'en'] as const).map((lng) => (
              <button
                key={lng}
                type="button"
                onClick={() => setLocale(lng)}
                className={`px-2.5 py-1.5 text-xs font-medium ${i18n.language === lng ? 'bg-kiosk-primary text-kiosk-text' : 'text-kiosk-textSecondary hover:bg-white'}`}
                aria-label={lng === 'ko' ? t('langKo') : t('langEn')}
              >
                {lng === 'ko' ? 'KO' : 'EN'}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
              else document.exitFullscreen?.();
            }}
            className="p-2 rounded-lg hover:bg-kiosk-surface transition-colors text-kiosk-text"
            aria-label={t('fullscreen')}
            title={t('fullscreenTitle')}
          >
            <Maximize2 className="h-5 w-5" />
          </button>
          <Link
            to="/cart"
            className="flex items-center gap-1.5 text-kiosk-text p-2 rounded-lg hover:bg-kiosk-surface transition-colors"
            aria-label={t('cart')}
          >
            <ShoppingCart className="h-5 w-5" />
          </Link>
          {user ? (
            <Link
              to="/mypage"
              className="p-2 rounded-lg hover:bg-kiosk-surface transition-colors text-kiosk-text"
              aria-label={t('mypage')}
            >
              <User className="h-5 w-5" />
            </Link>
          ) : (
            <Link to="/login" className="text-sm font-medium text-kiosk-primary">
              {t('login')}
            </Link>
          )}
        </div>
      </header>

      <div className="flex w-full bg-white border-b border-kiosk-border">
        <button
          type="button"
          onClick={() => setSelectedCategoryId(null)}
          className={`flex-1 min-w-0 py-3 px-2 text-sm font-medium border-r border-kiosk-border last:border-r-0 ${
            selectedCategoryId === null
              ? 'bg-kiosk-primary text-kiosk-text'
              : 'bg-kiosk-surface text-kiosk-textSecondary hover:bg-[#fff9e0]'
          }`}
        >
          {t('all')}
        </button>
        {[...categories]
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
          .map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setSelectedCategoryId(c.id)}
            className={`flex-1 min-w-0 py-3 px-2 text-sm font-medium border-r border-kiosk-border last:border-r-0 ${
              selectedCategoryId === c.id
                ? 'bg-kiosk-primary text-kiosk-text'
                : 'bg-kiosk-surface text-kiosk-textSecondary hover:bg-[#fff9e0]'
            }`}
          >
            {i18n.language === 'en' ? (t(`categories.${c.name}`) || c.name) : c.name}
          </button>
          ))}
      </div>

      <main className="flex-1 overflow-auto p-4 md:p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
          {displayItems.map((item) => {
            const inCart = lines.some((l) => l.productId === item.id);
            return (
            <Link
              key={item.id}
              to={`/menu/${item.id}`}
              className={`block ${item.isSoldOut ? 'opacity-75' : ''}`}
            >
              <div className="relative aspect-square bg-white rounded-md overflow-hidden">
                {item.images[0]?.url ? (
                  <img
                    src={item.images[0].url}
                    alt=""
                    className={`w-full h-full object-cover ${item.isSoldOut ? 'grayscale opacity-70' : ''}`}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <span
                  className={`absolute inset-0 flex items-center justify-center text-kiosk-textSecondary text-sm bg-white ${item.images[0]?.url ? 'hidden' : ''}`}
                >
                  {t('noImage')}
                </span>
                {inCart && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-md" aria-hidden>
                    <Check className="h-10 w-10 text-white shrink-0" strokeWidth={3} />
                  </span>
                )}
                {item.isSoldOut && (
                  <span className="absolute top-0 left-0 bg-kiosk-textSecondary text-white text-[10px] font-bold py-1 px-2 rounded-br">
                    {t('soldOut')}
                  </span>
                )}
                {item.isBest && (
                  <span className="absolute top-0 right-0 bg-kiosk-primary text-kiosk-text text-[10px] font-bold py-1 px-2 rounded-bl">
                    {t('best')}
                  </span>
                )}
              </div>
              <p className={`font-medium text-sm truncate mt-1 ${item.isSoldOut ? 'text-kiosk-textSecondary' : 'text-kiosk-text'}`}>
                {i18n.language === 'en' && item.englishName ? item.englishName : item.name}
              </p>
              <p className="text-xs text-kiosk-textSecondary">{item.basePrice.toLocaleString()}{t('currencyUnit')}</p>
            </Link>
          );
          })}
        </div>
      </main>

      {/* 하단 슬라이스: 주문내역 가로 스크롤 + 총액·주문하기 */}
      <footer className="sticky bottom-0 bg-white border-t border-kiosk-border safe-area-pb">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <h2 className="text-sm font-semibold text-kiosk-text">
            {t('orderHistory')} {cartCount}
          </h2>
          <button
            type="button"
            onClick={clear}
            className="flex items-center gap-1.5 text-sm text-kiosk-textSecondary hover:text-kiosk-text p-1.5 rounded transition-colors"
            aria-label={t('reset')}
          >
            <RefreshCw className="h-4 w-4" />
            <span>{t('reset')}</span>
          </button>
        </div>
        <div className="flex gap-3 px-4 overflow-x-auto overflow-y-hidden pb-2">
          {lines.map((line, index) => (
            <div
              key={`${line.productId}-${index}`}
              className="flex-shrink-0 w-[160px] md:w-[180px] rounded-lg border border-kiosk-border bg-kiosk-surface p-2 flex flex-col"
            >
              <div className="relative">
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="absolute top-0 right-0 z-10 p-1 rounded-full bg-white/90 text-kiosk-textSecondary hover:text-kiosk-error hover:bg-white shadow-sm"
                  aria-label={t('delete')}
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="w-full aspect-square rounded-md overflow-hidden bg-white">
                  {line.imageUrl ? (
                    <img src={line.imageUrl} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <span className="flex items-center justify-center w-full h-full text-kiosk-textSecondary text-xs">{t('noImage')}</span>
                  )}
                </div>
              </div>
              <p className="font-medium text-sm text-kiosk-text truncate mt-1.5">{line.name}</p>
              <p className="text-xs text-kiosk-textSecondary">
                {(line.unitPrice * line.quantity).toLocaleString()}{t('currencyUnit')}
              </p>
              <div className="flex items-center gap-1 mt-2">
                <button
                  type="button"
                  onClick={() => updateQuantity(index, Math.max(1, line.quantity - 1))}
                  className="w-7 h-7 flex items-center justify-center rounded border border-kiosk-border bg-white text-kiosk-text hover:bg-kiosk-surface text-sm font-medium"
                >
                  −
                </button>
                <span className="w-7 text-center text-sm font-medium text-kiosk-text">{line.quantity}</span>
                <button
                  type="button"
                  onClick={() => updateQuantity(index, line.quantity + 1)}
                  className="w-7 h-7 flex items-center justify-center rounded border border-kiosk-border bg-white text-kiosk-text hover:bg-kiosk-surface text-sm font-medium"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-kiosk-border bg-white">
          <span className="font-semibold text-kiosk-text">
            {t('total', {
              value: i18n.language === 'en'
                ? `${totalPrice.toLocaleString()}${t('currencyUnit')}`.trim()
                : totalPrice.toLocaleString(),
            })}
          </span>
          <Link
            to={lines.length > 0 ? '/cart' : '#'}
            className={`flex-1 max-w-[200px] ml-4 py-3 rounded-xl text-center font-semibold text-kiosk-text transition-opacity ${
              lines.length > 0 ? 'bg-kiosk-primary' : 'bg-kiosk-border cursor-not-allowed opacity-60'
            }`}
            onClick={(e) => lines.length === 0 && e.preventDefault()}
          >
            {t('orderBtn')}
          </Link>
        </div>
      </footer>
    </div>
  );
}
