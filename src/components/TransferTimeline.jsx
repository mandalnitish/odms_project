const STEPS = ['harvested', 'in_transit', 'arrived', 'delivered'];

const stepLabels = {
  harvested: '🫀 Organ Harvested',
  in_transit: '🚑 In Transit',
  arrived: '🏥 Arrived at Hospital',
  delivered: '✅ Successfully Delivered',
};

export default function TransferTimeline({ status }) {
  const currentIndex = STEPS.indexOf(status);

  return (
    <div className="flex items-center gap-2 my-4">
      {STEPS.map((step, i) => (
        <div key={step} className="flex items-center gap-2">
          <div className={`flex flex-col items-center`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
              ${i <= currentIndex ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
              {i + 1}
            </div>
            <span className="text-xs mt-1 text-center w-20">{stepLabels[step]}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`h-1 w-12 rounded ${i < currentIndex ? 'bg-green-500' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}