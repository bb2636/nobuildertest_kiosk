import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';

export function OrderDone() {
  const [searchParams] = useSearchParams();
  const orderNo = searchParams.get('orderNo') ?? '';

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-6 text-center">
      <h2 className="text-xl font-semibold text-kiosk-text mb-2">주문이 접수되었습니다</h2>
      <p className="text-kiosk-textSecondary mb-1">주문번호</p>
      <p className="text-2xl font-bold text-kiosk-primary mb-6">{orderNo}</p>
      <p className="text-sm text-kiosk-textSecondary mb-8">준비가 완료되면 알려드리겠습니다.</p>
      <Link to="/">
        <Button theme="kiosk" fullWidth>
          홈으로 돌아가기
        </Button>
      </Link>
    </div>
  );
}
