class OrderStatusChannel < ApplicationCable::Channel
  def subscribed
    order = Order.find_by(id: params[:order_id])

    if order
      stream_for order
    else
      reject
    end
  end

  def unsubscribed
    stop_all_streams
  end
end
