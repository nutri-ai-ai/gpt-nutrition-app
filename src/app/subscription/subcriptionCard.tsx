type SubscriptionCardProps = {
    title: string
    description: string
    price: string
    onSelect: () => void
  }
  
  const SubscriptionCard = ({ title, description, price, onSelect }: SubscriptionCardProps) => {
    return (
      <div
        className="w-60 p-6 bg-white shadow-lg rounded-lg cursor-pointer hover:shadow-xl transition"
        onClick={onSelect}
      >
        <h3 className="text-xl font-semibold text-blue-600">{title}</h3>
        <p className="text-gray-500 mt-2">{description}</p>
        <p className="text-lg font-bold text-blue-700 mt-4">{price}</p>
      </div>
    )
  }
  
  export default SubscriptionCard
  