const handlePlaceOrder = async (e) => {
    e.preventDefault();
    
    // Check if shipping address is available
    if (!hasShippingAddress) {
      notify.error('Please update your shipping address before placing an order');
      navigate('/account');
      return;
    }
    
    // Validate all required fields are filled
    const requiredFields = ['name', 'phone', 'email', 'address', 'city', 'state', 'postal_code'];
    const missingFields = requiredFields.filter(field => !shippingDetails[field]?.trim());
    
    if (missingFields.length > 0) {
      setError(`Please provide your ${missingFields.map(f => f.replace('_', ' ')).join(', ')}`);
      notify.error('Please complete all required shipping information');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // Format the complete address
      const formattedAddress = `${shippingDetails.address}, ${shippingDetails.city}, ${shippingDetails.state} ${shippingDetails.postal_code}`;
      
      // Create the order with required fields
      const orderResult = await createOrder(user.id, {
        address: formattedAddress,
        payment_method: 'dragonpay'
      });
      
      // Process payment with DragonPay
      const paymentResult = await processPayment(
        orderResult.order_id, 
        user.email || 'customer@example.com'
      );
      
      window.location.href = paymentResult.payment_url;
    } catch (err) {
      handleError(err);
      console.error('Checkout error:', err);
    } finally {
      setLoading(false);
    }
  }; 