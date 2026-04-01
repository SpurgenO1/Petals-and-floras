from django.db import migrations, models
import django.db.models.deletion


def backfill_order_history(apps, schema_editor):
    Order = apps.get_model("shop", "Order")
    OrderHistory = apps.get_model("shop", "OrderHistory")

    for order in Order.objects.all().iterator():
        OrderHistory.objects.update_or_create(
            source_order_id=order.id,
            defaults={
                "user_id": order.user_id,
                "customer_name": order.name,
                "phone": order.phone,
                "city": order.city,
                "pincode": order.pincode,
                "items": order.items,
                "status": order.status,
                "total_amount": order.total_amount,
                "payment_order_id": order.payment_order_id,
                "payment_id": order.payment_id,
                "mongo_order_id": order.mongo_order_id,
                "ordered_at": order.created_at,
            },
        )


class Migration(migrations.Migration):

    dependencies = [
        ("shop", "0005_order_mongo_order_id"),
    ]

    operations = [
        migrations.CreateModel(
            name="OrderHistory",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("customer_name", models.CharField(max_length=100)),
                ("phone", models.CharField(blank=True, default="", max_length=15)),
                ("city", models.CharField(blank=True, default="", max_length=50)),
                ("pincode", models.CharField(blank=True, default="", max_length=10)),
                ("items", models.JSONField(default=list)),
                ("status", models.CharField(choices=[("Pending", "Pending"), ("Paid", "Paid"), ("Cancelled", "Cancelled")], default="Pending", max_length=20)),
                ("total_amount", models.IntegerField(default=0)),
                ("payment_order_id", models.CharField(blank=True, default="", max_length=100)),
                ("payment_id", models.CharField(blank=True, default="", max_length=100)),
                ("mongo_order_id", models.CharField(blank=True, default="", max_length=100)),
                ("ordered_at", models.DateTimeField()),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("source_order", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="history_entries", to="shop.order")),
                ("user", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="order_history_entries", to="auth.user")),
            ],
            options={
                "verbose_name": "Order History",
                "verbose_name_plural": "Order History",
                "ordering": ["-ordered_at", "-id"],
            },
        ),
        migrations.RunPython(backfill_order_history, migrations.RunPython.noop),
    ]
