CC = gcc
CFLAGS = -Wall -Wextra -O2 -std=c11 -pthread -D_GNU_SOURCE
LDFLAGS = -lpq -lm -pthread

SRCDIR = src
INCDIR = include
OBJDIR = obj
BINDIR = bin

SOURCES = $(wildcard $(SRCDIR)/*.c)
OBJECTS = $(SOURCES:$(SRCDIR)/%.c=$(OBJDIR)/%.o)
TARGET = $(BINDIR)/log-collector-c

.PHONY: all clean install

all: $(TARGET)

$(TARGET): $(OBJECTS) | $(BINDIR)
	$(CC) $(OBJECTS) -o $@ $(LDFLAGS)

$(OBJDIR)/%.o: $(SRCDIR)/%.c | $(OBJDIR)
	$(CC) $(CFLAGS) -I$(INCDIR) -c $< -o $@

$(OBJDIR):
	mkdir -p $(OBJDIR)

$(BINDIR):
	mkdir -p $(BINDIR)

clean:
	rm -rf $(OBJDIR) $(BINDIR)

install: $(TARGET)
	cp $(TARGET) /usr/local/bin/

.PHONY: help
help:
	@echo "Système de collecte de logs en C"
	@echo ""
	@echo "Usage:"
	@echo "  make          - Compiler le projet"
	@echo "  make clean    - Nettoyer"
	@echo "  make install  - Installer"
	@echo ""
	@echo "Exécution:"
	@echo "  ./bin/log-collector-c"

