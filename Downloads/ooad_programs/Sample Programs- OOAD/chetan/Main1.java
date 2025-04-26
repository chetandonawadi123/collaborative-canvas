import java.util.ArrayList;
import java.util.List;
import java.util.Scanner;

class Item {
    private String name;
    private int quantity;
    private int price;

    public Item(String name, int quantity, int price) {
        this.name = name;
        this.quantity = quantity;
        this.price = price;
    }

    public int getTotalPrice() {
        return quantity * price;
    }

    public String getName() {
        return name;
    }

    public int getQuantity() {
        return quantity;
    }

    public int getPrice() {
        return price;
    }
}

class ShoppingCart {
    private List<Item> items;

    public ShoppingCart() {
        items = new ArrayList<>();
    }

    public void addItem(String name, int price) {
        addItem(1, name, price);
    }

    public void addItem(int quantity, String name, int price) {
        items.add(new Item(name, quantity, price));
        System.out.println("Added " + quantity + " unit(s) of " + name + " to the shopping cart. Cost per unit: $" + price + ".");
    }

    public int calculateTotal() {
        return items.stream().mapToInt(Item::getTotalPrice).sum();
    }
}

class PaymentProcessor {
    public void processPayment(double amount) {
        System.out.printf("Processing cash on delivery payment of $%.2f\n", amount);
    }

    public void processPayment(double amount, String cardNumber) {
        System.out.printf("Processing credit card payment of $%.2f using card number:%s\n", amount, cardNumber);
    }

    public void processPayment(double amount, String bankName, String accountNumber) {
        System.out.printf("Processing net banking payment of $%.2f via %s account number:%s\n", amount, bankName, accountNumber);
    }
}

public class Main1 {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        ShoppingCart cart = new ShoppingCart();

        while (scanner.hasNextLine()) {
            String input = scanner.nextLine();
            String[] inputParts = input.split(" ");

            if (inputParts[0].equals("addItem")) {
                if (inputParts.length == 3) {
                    String itemName = inputParts[1];
                    int price = Integer.parseInt(inputParts[2]);
                    cart.addItem(itemName, price);
                } else if (inputParts.length == 4) {
                    int quantity = Integer.parseInt(inputParts[1]);
                    String itemName = inputParts[2];
                    int price = Integer.parseInt(inputParts[3]);
                    cart.addItem(quantity, itemName, price);
                }
            } else if (inputParts[0].equals("processPayment")) {
                double amount = Double.parseDouble(inputParts[1]);
                PaymentProcessor paymentProcessor = new PaymentProcessor();

                if (inputParts.length == 2) {
                    paymentProcessor.processPayment(amount);
                } else if (inputParts.length == 3) {
                    String cardNumber = inputParts[2];
                    paymentProcessor.processPayment(amount, cardNumber);
                } else if (inputParts.length == 4) {
                    String bankName = inputParts[2];
                    String accountNumber = inputParts[3];
                    paymentProcessor.processPayment(amount, bankName, accountNumber);
                }
            }
        }
        scanner.close();
    }
}