/**
 * Author : Sloubi
 * Site : sloubi.eu/#/project/solitaire
 * Last update : 2014-01-19
 */


var Solitaire = {
  suits: ['spades', 'hearts', 'clubs', 'diams'],
  values: 'A 2 3 4 5 6 7 8 9 10 J Q K'.split(' '),
  deck: [],
  foundations: [],
  cardWidth: 90,
  cardHeight: 130,
  cardMargin: 10,
  cardOverMargin: 20,
  tableTop: 40,
  pilesTop: 150,
  wasteLeft: 110,
  gap: 0
};

// Bootstrap
$(function () {

  // Corrige un bug bizarre
  // il semble qu'il y ait un décalage vertical dans les utilisations de getCardElFromPoint
  Solitaire.gap = 6;

  createTable();
  createDeck();
  mixDeck();
  distribute();
  createStock();
  createFoundations();

});

function createTable() {
  // Dialog quand on gagne
  var dialog = '<div id="dialog-won" title="Vous avez gagné. Bravo !" style="display:none;">' +
    '<p>' +
      'Bravo, vous avez gagné la partie <strong>en <span>x</span> mouvements</strong>.<br>' +
      'Que souhaitez-vous faire maintenant ?' +
    '</p>' +
  '</div>';

  // Centre la table
  // On lui donne également une largeur et une hauteur
  // pour qu'un ne puisse pas sortir les cartes de la table
  var tableWidth = 7 * Solitaire.cardWidth + 12 * Solitaire.cardMargin;
  Solitaire.tableLeft = $(window).width() / 2 - tableWidth / 2;
  $('#table').css({
    left: Solitaire.tableLeft + 'px',
    top: Solitaire.tableTop + 'px',
    width: $(window).width() - Solitaire.tableLeft + 'px',
    height: $(window).height() - Solitaire.tableTop + 'px'
  })
  .after('<div id="bar"><button id="new-game">Nouvelle partie</button><button id="replay">Rejouer la partie</button></div>')
  .after(dialog);

  $(document).on('click', '#new-game', newGame);
  $(document).on('click', '#replay', replay);
}

function distribute() {
  var cardTpl  = '<div class="card {5}" id="card-{0}" style="top: {1}px; left: {2}px; z-index: {3}">{4}</div>';
  var emptyTpl = '<div class="empty" style="top: {0}px; left: {1}px;"></div>';
  var index    = 0;
  var $table   = $('#table');

  for (var col = 0; col <= 7; col++) {
    for (var row = 0; row < col; row++) {

      // Mise à jour de la carte
      var card      = Solitaire.deck[index];
      card.posX     = (Solitaire.cardWidth + Solitaire.cardMargin * 2) * (col - 1);
      card.posY     = Solitaire.pilesTop + Solitaire.cardOverMargin * row;
      card.face     = row == col - 1 ? 'up' : 'down';
      card.location = 'piles';
      card.zIndex   = row + 1;

      // Emplacement vide
      if (row == 0) {
        $table.append(emptyTpl.format(Solitaire.pilesTop, card.posX));
      }

      // Placement de la carte
      var htmlClass = card.color + ' ' + card.face;
      var htmlCard  = cardTpl.format(index, card.posY, card.posX, card.zIndex, card.face == 'up' ? getCardName(index) : '', htmlClass);
      $table.append(htmlCard);

      index++;
    }
  }

  Solitaire.currentCardInStock = index;

  updateDraggable();
}

function createStock() {
  var stockTpl = '<div id="stock" class="card down stock"></div>';
  $('#table').prepend('<div id="reload" class="empty">&#8635;</div>' + stockTpl);

  $('#stock').click(function (ev) {
    var cardTpl = '<div class="card up {3}" id="card-{0}" style="left: {1}px; z-index: 1;">{2}</div>';
    var card    = Solitaire.deck[Solitaire.currentCardInStock];

    card.location = 'waste';
    card.face     = 'up';
    card.zIndex   = 1;
    card.posX     = Solitaire.wasteLeft;
    card.posY     = 0;
    $('#table').append(cardTpl.format(card.index, card.posX, getCardName(card.index), card.color));

    updateDraggable();
    updateStock();
  });
}

function updateStock() {
  // On cherche la prochaine carte qui sera piochée
  for (var i = Solitaire.currentCardInStock; i <= 52; i++) {
    var nextCard = Solitaire.deck[i];

    // Si il n'y a plus de carte dans la pioche
    // le prochain clic transformera le waste en pioche
    if (typeof nextCard == 'undefined') {
      prepareReload();
      break;
    }

    if (nextCard.location == 'stock') {
      Solitaire.currentCardInStock = i;
      break;
    }
  }
}

// Quand la pioche est vide,
// un nouveau clic sur la pioche permet de la réinitialiser
function prepareReload() {
  $('#stock').hide();
  $('#reload').click(function () {
    for (var index in Solitaire.deck) {
      var card = Solitaire.deck[index];

      if (card.location == 'waste' || card.location == 'stock') {
        card.location = 'stock';
        card.face     = 'down';
        card.posX     = 0;
        $('#card-' + index).remove();
      }
    }
    $('#stock').show();
    updateStock();
  });
  Solitaire.currentCardInStock = 28;
}

function createFoundations() {
  var foundationTpl = '<div id="{0}" class="base foundation" style="left: {1}px;">{2}</div>';
  var foundations   = '';
  var left          = 330;

  Solitaire.foundations['spades'] = false;
  Solitaire.foundations['hearts'] = false;
  Solitaire.foundations['clubs']  = false;
  Solitaire.foundations['diams']  = false;

  for (var i in Solitaire.suits) {
    var posX = left + Solitaire.cardWidth * i + Solitaire.cardMargin * i * 2;
    foundations += foundationTpl.format(
      Solitaire.suits[i],
      posX,
      '&' + Solitaire.suits[i] + ';'
    );
  }

  $('#table').prepend(foundations);
}

function updateDraggable() {
  $('.ui-draggable').draggable('destroy');

  for (var index in Solitaire.deck) {
    var card = Solitaire.deck[index];

    if ((card.location == 'piles' || card.location == 'waste') && card.face == 'up') {

      var cardsOver = getCardsOver(card);
      Solitaire.deck[index].cardsOnMe = cardsOver;

      // Si il y a au moins 1 carte sur "card"
      if (cardsOver.length > 0) {
        // Déplacement de la carte plus toutes celles qui sont dessus
        $('#card-' + index).draggable({
          delay: 50,
          zIndex: 200,
          containment: 'body',
          stop: function (ev, ui) {
            // le zindex de draggable revient à sa valeur initial dès l'event stop
            // mais si le mouvement est annulé, il faut que la carte revienne en passant au dessus des autres
            $(this).css('z-index', 200);
            dropCard(this.id);
          },
          drag: function(ev, ui) {
            var z         = 1;
            var cardIndex = ev.target.id.replace('card-', ''); // Carte qui est déplacée
            var cardsOnMe = Solitaire.deck[cardIndex].cardsOnMe;

            for (var cardOnMe in cardsOnMe) {
              $('#card-' + cardsOnMe[cardOnMe]).css({
                top: ui.position.top + Solitaire.cardOverMargin * z,
                left: ui.position.left,
                zIndex: 200 + z++
              });
            }
          }
        });
      }

      else {
        // Double clic pour envoyer dans les fondations
        $('#card-' + index).dblclick(function () {
          var $this  = $(this);
          var card   = Solitaire.deck[$this.attr('id').replace('card-', '')];
          var posX   = card.posX;
          var posY   = card.posY;
          var $below = getLastJCardOnFoundation(card.suit);

          if (isAllowedMove(card, $below)) {
            moveCard(card, $below);

            // On retourne la carte qui était juste en dessous avant de déplacer
            turnCardByPos(posX, posY - Solitaire.cardOverMargin + Solitaire.gap);
            updateDraggable();
          }
        });

        $('#card-' + index).draggable({
          delay: 50,
          zIndex: 200,
          containment: 'body',
          stop: function (ev, ui) {
            // le zindex de draggable revient à sa valeur initial dès l'event stop
            // mais si le mouvement est annulé, il faut que la carte revienne en passant au dessus des autres
            $(this).css('z-index', 200);
            dropCard(this.id);
          }
        });
      }
    }
  }
}

// Retourne les index des cartes au dessus de "card"
function getCardsOver(card) {
  var cardsOver     = [];
  var cardOverIndex = null;

  do {
    cardOverIndex = getCardOver(card);
    if (cardOverIndex !== false) {
      var card = Solitaire.deck[cardOverIndex];
      cardsOver.push(cardOverIndex);
    }
  } while (cardOverIndex !== false);

  return cardsOver;
}

// Retourne l'index de la carte qui est sur "card" ou false
function getCardOver(card) {
  var $cardOver     = getCardElFromPoint(card.posX, card.posY + Solitaire.cardOverMargin + Solitaire.gap);
  if ( ! $cardOver) return false;
  var cardOverIndex = parseInt($cardOver.attr('id').replace('card-', ''));
  return card.index != cardOverIndex ? cardOverIndex : false;
}

// Transforme l'index d'une carte en son ID HTML correspondant
// 2 => '#card-2'
function indexToHtlmId(index) {
  if (typeof index == 'object') {
    var indexes = [];
    for (var i in index)
      indexes.push('#card-' + index[i]);
    return indexes.join(',');
  }
  else {
    return '#card-' + index;
  }
}

function getLastJCardOnFoundation(suit) {
  var lastCard = Solitaire.foundations[suit];
  if ( ! lastCard) return $('#' + suit);
  return $('#card-' + lastCard);
}

function dropCard(cardId) {
  var index = cardId.replace('card-', '');
  var $card = $('#' + cardId);
  var pos   = $card.position();
  var card  = Solitaire.deck[index];

  // L'élément sous la carte qui vient d'être déposée
  // On cache la carte pour voir ce qu'il y a dessous
  $card.hide();

  // On cherche la carte en dessous en prenant le point au milieu et en haut de la carte
  // comme ça on peut déposer la carte par la droite ou la gauche
  var $below = getCardElFromPoint(pos.left + Solitaire.cardWidth / 2, pos.top, true);

  // La carte est bien déposée sur une autre carte ou un emplacement vide ou une fondation
  if ($below) {
    // Si le déplacement est autorisé
    if (isAllowedMove(card, $below)) {
      // On retourne la carte qui était juste en dessous avant de déplacer
      turnCardByPos(card.posX, card.posY - Solitaire.cardOverMargin + Solitaire.gap);
      // On déplace la carte et on met à jour les déplacements possibles
      moveCard(card, $below);
      updateDraggable();
    }

    // Mouvement interdit
    else { cancelMove(index); }
  }

  // Carte déposée sur la table et non sur une carte
  else { cancelMove(index); }
}

/**
 * Positionnement correct des cartes après un drop
 * @param  Object card   La carte qui est déplacée
 * @param  jQuery $below L'élément sur lequel la carte est déplacée (carte ou emplacement vide)
 */
function moveCard(card, $below) {
  // Si on déplace la carte sur un emplacement vide ou une fondation vide
  var emptySpot = $below.hasClass('empty') || $below.hasClass('foundation');

  // Création des positions de la première carte à déplacer
  var belowPos  = $below.position();
  var newPosX   = belowPos.left;
  var newPosY   = belowPos.top + (emptySpot ? 0 : Solitaire.cardOverMargin);
  var newZIndex = 1 + (emptySpot ? 0 : parseInt($below.css('z-index')));

  // Cartes à déplacer
  card.cardsOnMe.unshift(card.index);
  var movedCards = card.cardsOnMe;

  // Déplacements et mises à jour
  var i = 0;
  for (var idx in movedCards) {
    var movedCard = Solitaire.deck[movedCards[idx]];
    var zindex    = i + newZIndex;
    var overY     = Solitaire.cardOverMargin * i;

    if ($below.hasClass('foundation')) {
      zindex = cardValueToIndex(movedCard.value);
      $('#card-' + movedCard.index).addClass('foundation');
      Solitaire.foundations[movedCard.suit] = movedCard.index;
      overY = 0;
    }

    movedCard.posX     = newPosX;
    movedCard.posY     = newPosY + overY;
    movedCard.location = $below.hasClass('foundation') ? 'foundation' : 'piles';
    movedCard.zIndex   = zindex;

    $('#card-' + movedCard.index).css({
      left: movedCard.posX + 'px',
      top: movedCard.posY + 'px',
      zIndex: movedCard.zIndex
    }).show();

    i++;
  }

  if (isWon()) won();
}

function cardValueToIndex(value) {
  var index = value;
  if (value == 'A') index = 1;
  else if (value == 'J') index = 11;
  else if (value == 'Q') index = 12;
  else if (value == 'K') index = 13;
  return index;
}

function cancelMove(index) {
  var $card              = $('#card-' + index);
  var card               = Solitaire.deck[index];
  var allAnimateComplete = false;

  $card.animate({
    left: card.posX + 'px',
    top: card.posY + 'px',
  }, 400, function () {
    $(this).css('z-index', card.zIndex);
  }).show();

  // Si c'est un déplacement de plusieurs cartes
  if (card.cardsOnMe) {
    for (var i in card.cardsOnMe) {
      var cardOnMe = Solitaire.deck[card.cardsOnMe[i]];
      $('#card-' + cardOnMe.index).animate({
        left: cardOnMe.posX + 'px',
        top: cardOnMe.posY + 'px'
      }, 400, function () {
        if (i == card.cardsOnMe.length - 1)
          allAnimateComplete = true;
        checkAnimateComplete(allAnimateComplete, card.cardsOnMe);
      });
    }
  }
}

/**
 * Si isComplete, alors on remet tous les zIndex à leur valeur initiale
 * @param  Boolean        isComplete
 * @param  [card Object]  cardsOnMe
 */
function checkAnimateComplete(isComplete, cardsOnMe) {
  if ( ! isComplete) return false;
  for (var i in cardsOnMe) {
    var cardOnMe = Solitaire.deck[cardsOnMe[i]];
    $('#card-' + cardOnMe.index).css('z-index', cardOnMe.zIndex);
  }
}

function isWon() {
  for (var i in Solitaire.foundations) {
    var index = Solitaire.foundations[i];
    if (!index || Solitaire.deck[index].value != 'K')
      return false;
  }
  return true;
}

function won() {
  $( "#dialog-won" ).dialog({
    resizable: false,
    modal: true,
    width: 400,
    buttons: {
      "Lancer une nouvelle partie": function() {
        $(this).dialog("close");
      },
      "Rejouer la partie": function() {
        $(this).dialog("close");
      }
    }
  });
}

// Retourne la carte qui est en x, y
function turnCardByPos(x, y) {
  var $card = getCardElFromPoint(x, y);
  if ($card) {
    var index = $card.attr('id').replace('card-', '');
    $card.addClass('up').removeClass('down').html(getCardName(index));

    var card = Solitaire.deck[index];
    card.face = 'up';
  }
}

function getCardElFromPoint(x, y, emptyOrFoundationAllowed) {
  var $card = $(document.elementFromPoint(Solitaire.tableLeft + x, Solitaire.tableTop + y));

  // Chaque div.card contient 2 spans et une <figure> (pour les têtes)
  // il faut donc remonter au parent
  if ($card.context.nodeName == 'FIGURE' || $card.context.nodeName == 'SPAN') {
    $card = $card.closest('div.card');
  }

  // Si on doit considérer l'emplacement vide ou la fondation comme une carte (et donc ne pas renvoyer false)
  if (typeof emptyOrFoundationAllowed != 'undefined' && emptyOrFoundationAllowed)
    return $card.hasClass('card') || $card.hasClass('empty') || $card.hasClass('foundation') ? $card : false;
  else
    return $card.hasClass('card') ? $card : false;
}

function isAllowedMove(cardMoved, $below) {
  var cardBelow = $below.hasClass('card') ? Solitaire.deck[$below.attr('id').replace('card-', '')] : '';

  // Si l'élément en dessous est un emplacement vide, seul le roi est autorisé
  if ($below.hasClass('empty')) {
    return cardMoved.value == 'K';
  }

  // Si l'élément en dessous est une fondation vide et la carte déplacée est un as
  if ($below.hasClass('foundation') && cardMoved.value == "A") {
    return cardMoved.suit == $below.attr('id');
  }

  // Si l'élément en dessous est la pioche ou la pile de carte en cours (waste)
  if (typeof cardBelow == 'undefined' || cardBelow.location == 'waste') {
    return false;
  }

  // Si l'élément en dessous est une carte d'une fondation et de la bonne couleur
  if (cardBelow.location == 'foundation' && cardBelow.suit == cardMoved.suit) {
    var allowedValueIndex = Solitaire.values.indexOf(cardMoved.value) - 1;
    if (typeof Solitaire.values[allowedValueIndex] != 'undefined')
      return Solitaire.values[allowedValueIndex] == cardBelow.value;
  }

  // Si l'élément en dessous est une carte des piles
  // Il faut que les 2 cartes soient de couleur différente
  // et que la carte en dessous est comme valeur : la valeur de la carte déposée + 1
  // et qu'elle soit déjà retournée évidemment
  if (cardMoved.color != cardBelow.color && cardBelow.face == 'up' && cardBelow.location == 'piles') {
    var allowedValueIndex = Solitaire.values.indexOf(cardMoved.value) + 1;
    if (typeof Solitaire.values[allowedValueIndex] != 'undefined')
      return Solitaire.values[allowedValueIndex] == cardBelow.value;
  }

  return false;
}

function createDeck() {
  for (var suit in Solitaire.suits) {
    for (var value in Solitaire.values) {
      Solitaire.deck.push({
        suit: Solitaire.suits[suit],
        value: Solitaire.values[value],
        color: Solitaire.suits[suit] == 'hearts' || Solitaire.suits[suit] == 'diams' ? 'red' : 'black',
        location: 'stock',
        face: 'down',
        zIndex: 1
      });
    }
  }
}

function mixDeck() {
  // from http://stackoverflow.com/questions/813935/randomizing-elements-in-an-array
  var i = Solitaire.deck.length;
  while (--i) {
    var j = Math.floor(Math.random() * (i + 1))
    var temp = Solitaire.deck[i];
    Solitaire.deck[i] = Solitaire.deck[j];
    Solitaire.deck[j] = temp;
  }

  // Création des index des cartes
  for (var index in Solitaire.deck) {
    Solitaire.deck[index].index = index;
  }
}

function newGame() {
  Solitaire.deck = [];
  Solitaire.foundations = [];

  $('#table').empty();

  createDeck();
  mixDeck();
  distribute();
  createStock();
  createFoundations();
}

function replay() {
  Solitaire.foundations = [];
  $('#table').empty();

  for (var i in Solitaire.deck) {
    Solitaire.deck[i].location  = 'stock',
    Solitaire.deck[i].face      = 'down';
    Solitaire.deck[i].zIndex    = 1;
    Solitaire.deck[i].cardsOnMe = null;
  }

  distribute();
  createStock();
  createFoundations();
}

function getCardName(index) {
  var name = '<span>' + Solitaire.deck[index].value + ' &' + Solitaire.deck[index].suit + ';</span>';
  switch (Solitaire.deck[index].value) {
    case 'A':
      name += '<figure>&' + Solitaire.deck[index].suit + ';</figure>'
      break;
    case 'J':
      name += '<figure>&#9816;</figure>'
      break;
    case 'Q':
      name += '<figure>&#9813;</figure>'
      break;
    case 'K':
      name += '<figure>&#9812;</figure>'
      break;
  }
  name += '<span>' + Solitaire.deck[index].value + ' &' + Solitaire.deck[index].suit + ';</span>';
  return name;
}



// String Helper
if (!String.prototype.format) {
  String.prototype.format = function() {

    var args = arguments;
    var sprintfRegex = /\{(\d+)\}/g;

    var sprintf = function (match, number) {
      return number in args ? args[number] : match;
    };

    return this.replace(sprintfRegex, sprintf);
  };
}
