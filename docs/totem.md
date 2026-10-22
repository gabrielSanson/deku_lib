# Totem in the shop

The totem is the normal shop site in **totem mode**. Opening `/totem` once in a
browser turns that browser into the shop's totem:

- the menu opens full width, with a **Recomeçar** button in the header;
- checkout offers **Comer aqui** and **Para viagem** (no delivery, no address step),
  the phone is optional and the order is called by its number;
- payment: **Pix** (QR on screen, the customer pays with their phone) and
  **Pagar no caixa** (the order waits until the attendant takes the payment;
  only then does it reach the kitchen). Card on the totem screen is not offered;
  the counter takes cards;
- after the order, the screen shows the order number and goes back to the menu
  after 45 seconds; an abandoned cart is cleared after 2 minutes without a touch
  (5 minutes on the Pix screen);
- no "Conta", no "Acompanhar pedido" link, so the next customer never sees the
  last one's order.

`/totem?sair` turns the browser back into a normal one.

## Run it on a Windows PC

1. The shop must be running and reachable from the totem PC:
   - on the shop server: `deploy/shop.sh up -d` (see [deploy/README.md](../deploy/README.md)),
     address `https://<your domain>`;
   - or, to try it on your own PC: in the `deku_lib` folder run `pnpm dev` and, in a
     second terminal, `pnpm worker`; the address is `http://localhost:5173`.
2. On the totem PC, right-click the desktop → **Novo → Atalho**, and paste
   (Chrome; change the address):

   ```
   "C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk --app=https://pedido.dekuburger.com.br/totem --user-data-dir=C:\deku-totem --no-first-run --noerrdialogs --disable-translate --disable-pinch --overscroll-history-navigation=0
   ```

   Or with Edge, which every Windows has:

   ```
   "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --kiosk https://pedido.dekuburger.com.br/totem --edge-kiosk-type=fullscreen --no-first-run --user-data-dir=C:\deku-totem
   ```

   Name it "Totem Deku". Double-click it: the menu opens full screen with no
   address bar. **Alt+F4** closes it.

3. To open it when the PC turns on: press **Win+R**, type `shell:startup`, and
   copy the shortcut into that folder.
4. In Windows settings set **Energia → Desligar a tela: Nunca** and turn off
   sleep, so the totem stays on.

`--user-data-dir` gives the totem its own browser profile, so totem mode does not
leak into your everyday browser.

## At the counter

"Pagar no caixa" orders show in **Pedidos** as waiting for payment with the
number the customer says. Open the order → **Receber pagamento**, take cash or
card, and the order goes to the kitchen. Pix orders confirm by themselves with
Mercado Pago, or by hand when Pix goes to the shop's own key.
