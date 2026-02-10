import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Lottie from 'lottie-react';
import { Button } from '../../components/ui/Button';

const AUTO_REDIRECT_SEC = 5;

export function OrderDone() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderNo = searchParams.get('orderNo') ?? '';
  const pointsEarned = searchParams.get('points') ?? '';
  const [animationData, setAnimationData] = useState<object | null>(null);
  const [countdown, setCountdown] = useState(AUTO_REDIRECT_SEC);

  useEffect(() => {
    fetch('/lottie/success.json')
      .then((res) => res.json())
      .then(setAnimationData)
      .catch(() => setAnimationData(null));
  }, []);

  useEffect(() => {
    if (countdown <= 0) {
      navigate('/', { replace: true });
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-6 text-center">
      <div className="w-48 h-48 mb-4 flex items-center justify-center">
        {animationData ? (
          <Lottie
            animationData={animationData}
            loop={false}
            style={{ width: 192, height: 192 }}
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-kiosk-primary flex items-center justify-center text-3xl text-kiosk-text">
            ✓
          </div>
        )}
      </div>
      <h2 className="text-xl font-semibold text-kiosk-text mb-2">주문이 완료되었습니다.</h2>
      <p className="text-kiosk-textSecondary mb-1">주문번호</p>
      <p className="text-2xl font-bold text-kiosk-primary mb-2">{orderNo}</p>
      {pointsEarned && (
        <p className="text-sm text-kiosk-textSecondary mb-2">
          적립 포인트 <span className="font-semibold text-kiosk-primary">+{Number(pointsEarned).toLocaleString()}P</span>
        </p>
      )}
      <p className="text-sm text-kiosk-textSecondary mb-4">준비가 완료되면 알려드리겠습니다.</p>
      <p className="text-sm text-kiosk-textSecondary mb-6">
        <span className="font-medium text-kiosk-text">{countdown}</span>초 뒤 자동으로 홈으로 이동합니다.
      </p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Link to="/" className="block">
          <Button theme="kiosk" fullWidth>
            확인
          </Button>
        </Link>
      </div>
    </div>
  );
}
