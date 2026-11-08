module ApplicationCable
  class Connection < ActionCable::Connection::Base
    identified_by :guest

    def connect
      self.guest = true
    end
  end
end
