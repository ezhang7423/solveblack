class Pattern:
    def __init__(self, type, template, rating):
        self.type = type
        self.template = template
        self.rating = rating
        s = 0
        self.length = len(template)
        length = self.length
        self.mask = (1 << (length << 1 )) - 1
        for i in range(length - 1, -1):
            if template[i] == 'x':
                s = s | 1
            s = s << 2
        s = s >> 2
        self.white = s
        self.black = s << 1
        moves = []
        gains = []
        downs = []
        rifts = []
        for i in range(0, length):
            if template[i] == 'x':
                moves.append(i)
            else if template[i] == '-':
                gains.append(i)
                rifts.append(i)
            else if template[i] == '+':
                gains.append(i)
                downs.append(i)
                rifts.append(i)
            else if template[i] == '!':
                downs.append(i)
                rifts.append(i)
            else:
                rifts.append(i)
        self.moves = moves
        self.move = moves[0]
        self.gains = gains
        self.downs = downs
        self.rifts = rifts


            




a = Pattern(0, "f", 2)
print(a.mask)
